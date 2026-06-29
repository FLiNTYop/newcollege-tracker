// scanner.js — the core engine. Run on a schedule (see scheduler.js).
// 1. Pulls recent Gmail messages, classifies them, stores important ones as tasks.
// 2. Pulls Classroom coursework/announcements with due dates, stores as tasks.
// 3. For anything newly stored, sends a push notification.

const { google } = require('googleapis');
const db = require('./db');
const { classifyEmail } = require('./classifier');
const { getClientForUser } = require('./googleAuth');
const { sendPush } = require('./notify');

const TRUSTED_DOMAINS = (process.env.TRUSTED_EMAIL_DOMAINS || '')
  .split(',')
  .map(d => d.trim())
  .filter(Boolean);

// --- helpers -----------------------------------------------------------

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function decodeBase64Url(data) {
  if (!data) return '';
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function extractPlainText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  return '';
}

// --- Gmail scanning ------------------------------------------------------

async function scanGmail(user) {
  const auth = getClientForUser(user.refresh_token);
  const gmail = google.gmail({ version: 'v1', auth });

  // Only look at mail from the last 2 days to keep this fast and cheap
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'newer_than:2d',
    maxResults: 30,
  });

  const messages = res.data.messages || [];
  const newTasks = [];

  for (const msgRef of messages) {
    const already = db.prepare(
      'SELECT 1 FROM processed_emails WHERE message_id = ? AND user_id = ?'
    ).get(msgRef.id, user.id);
    if (already) continue; // skip ones we've already checked before

    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msgRef.id,
      format: 'full',
    });

    const headers = full.data.payload.headers || [];
    const subject = getHeader(headers, 'Subject');
    const from = getHeader(headers, 'From');
    const bodyText = extractPlainText(full.data.payload) || full.data.snippet || '';

    const result = classifyEmail(subject, bodyText, from, TRUSTED_DOMAINS);

    // Mark as processed regardless of outcome, so we never re-check it
    db.prepare(
      'INSERT OR IGNORE INTO processed_emails (message_id, user_id) VALUES (?, ?)'
    ).run(msgRef.id, user.id);

    if (result.important) {
      const taskId = `gmail_${msgRef.id}`;
      const existing = db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId);
      if (!existing) {
        db.prepare(`
          INSERT INTO tasks (id, user_id, source, title, detail, due_date, course_or_sender, link, notified)
          VALUES (?, ?, 'gmail', ?, ?, ?, ?, ?, 0)
        `).run(
          taskId,
          user.id,
          subject || '(no subject)',
          bodyText.slice(0, 300),
          result.dueDateText,
          from,
          `https://mail.google.com/mail/u/0/#inbox/${msgRef.id}`
        );
        newTasks.push(taskId);
      }
    }
  }

  return newTasks;
}

// --- Classroom scanning ---------------------------------------------------

async function scanClassroom(user) {
  const auth = getClientForUser(user.refresh_token);
  const classroom = google.classroom({ version: 'v1', auth });

  const newTasks = [];

  const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
  const courses = coursesRes.data.courses || [];

  for (const course of courses) {
    // Coursework (assignments) with due dates
    let courseWork = [];
    try {
      const cwRes = await classroom.courses.courseWork.list({ courseId: course.id });
      courseWork = cwRes.data.courseWork || [];
    } catch (e) {
      console.warn(`Could not fetch coursework for ${course.name}:`, e.message);
    }

    for (const work of courseWork) {
      const taskId = `classroom_${work.id}`;
      const existing = db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId);
      if (existing) continue;

      let dueDate = null;
      if (work.dueDate) {
        const { year, month, day } = work.dueDate;
        dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Only track work that has a due date (otherwise it's not time-sensitive)
      if (!dueDate) continue;

      db.prepare(`
        INSERT INTO tasks (id, user_id, source, title, detail, due_date, course_or_sender, link, notified)
        VALUES (?, ?, 'classroom', ?, ?, ?, ?, ?, 0)
      `).run(
        taskId,
        user.id,
        work.title || '(untitled assignment)',
        work.description ? work.description.slice(0, 300) : '',
        dueDate,
        course.name,
        work.alternateLink || ''
      );
      newTasks.push(taskId);
    }
  }

  return newTasks;
}

// --- Notification dispatch -------------------------------------------------

async function notifyNewTasks(user, taskIds) {
  if (!taskIds.length) return;

  const rows = db.prepare(
    `SELECT * FROM tasks WHERE id IN (${taskIds.map(() => '?').join(',')})`
  ).all(...taskIds);

  for (const task of rows) {
    const dueText = task.due_date ? ` (due ${task.due_date})` : '';
    const title = task.source === 'classroom'
      ? `New Classroom task: ${task.course_or_sender}`
      : `Important email`;
    const emoji = task.source === 'classroom' ? '📘' : '📧';
    const message = `${emoji} ${task.title}${dueText}`;

    await sendPush(user.ntfy_topic, title, message, task.link);

    db.prepare('UPDATE tasks SET notified = 1 WHERE id = ?').run(task.id);
  }
}

// --- Entry point called by the scheduler -----------------------------------

async function runScanForUser(user) {
  console.log(`[scanner] Running scan for user ${user.email}`);
  try {
    const gmailTasks = await scanGmail(user);
    const classroomTasks = await scanClassroom(user);
    const allNew = [...gmailTasks, ...classroomTasks];
    await notifyNewTasks(user, allNew);
    console.log(`[scanner] Done. ${allNew.length} new task(s) found for ${user.email}`);
  } catch (err) {
    console.error(`[scanner] Error scanning for ${user.email}:`, err.message);
  }
}

async function runScanForAllUsers() {
  const users = db.prepare('SELECT * FROM users WHERE refresh_token IS NOT NULL').all();
  for (const user of users) {
    await runScanForUser(user);
  }
}

module.exports = { runScanForUser, runScanForAllUsers };

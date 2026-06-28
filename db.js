// db.js — handles all local data storage using a single SQLite file.
// No separate database server needed; everything lives in data/app.db

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'app.db'));
db.pragma('journal_mode = WAL');

// One row per logged-in user (in our case, just you — but built to support
// more than one user account if you ever want to share this with friends)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    refresh_token TEXT,
    ntfy_topic TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,           -- unique id: gmail message id OR classroom coursework id
    user_id TEXT,
    source TEXT,                   -- 'gmail' or 'classroom'
    title TEXT,
    detail TEXT,
    due_date TEXT,                 -- ISO date string, may be null
    course_or_sender TEXT,
    link TEXT,
    notified INTEGER DEFAULT 0,    -- have we already pushed a notification for this?
    completed INTEGER DEFAULT 0,   -- user can mark done on the dashboard
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS processed_emails (
    message_id TEXT PRIMARY KEY,
    user_id TEXT,
    processed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;

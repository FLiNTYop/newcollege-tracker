// notify.js — sends push notifications via ntfy.sh (free, no account needed)
// Works identically for phone (ntfy app) and laptop (ntfy desktop app or browser)

async function sendPush(topic, title, message, link = null) {
  if (!topic) {
    console.warn('No ntfy topic configured — skipping push notification.');
    return;
  }

  const headers = {
    'Title': title,
    'Priority': 'high',
    'Tags': 'books',
  };
  if (link) headers['Click'] = link;

  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      body: message,
      headers,
    });
    if (!res.ok) {
      console.error('ntfy push failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('ntfy push error:', err.message);
  }
}

module.exports = { sendPush };

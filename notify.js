// notify.js — sends push notifications via ntfy.sh (free, no account needed)
// Works identically for phone (ntfy app) and laptop (ntfy desktop app or browser)

// HTTP headers must be ASCII-only — the Fetch API throws if a header value
// contains characters outside Latin-1 (e.g. emoji, Devanagari script, etc).
// Email subjects and Classroom course names can contain anything, so we
// strip non-ASCII characters here before they ever reach a header. The
// message BODY has no such restriction and keeps full Unicode/emoji intact.
function toAsciiSafeHeader(value, fallback = 'Notification') {
  if (!value) return fallback;
  const ascii = String(value).replace(/[^\x20-\x7E]/g, '').trim();
  return ascii || fallback;
}

async function sendPush(topic, title, message, link = null) {
  if (!topic) {
    console.warn('No ntfy topic configured — skipping push notification.');
    return;
  }

  const headers = {
    'Title': toAsciiSafeHeader(title),
    'Priority': 'high',
    'Tags': 'books',
  };
  if (link) headers['Click'] = link;

  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      body: message, // body supports full Unicode — emoji and any language are safe here
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


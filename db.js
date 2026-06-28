// db.js — handles all local data storage using a single SQLite file.
// No separate database server needed; everything lives in data/app.db
//
// Uses node-sqlite3-wasm instead of better-sqlite3. Why: better-sqlite3 is a
// native module that needs a C++ compiler to install on Windows (Visual
// Studio Build Tools), which trips up a lot of first-time setups. The WASM
// driver needs zero compilation — just `npm install` and it works — at the
// small cost of being a little slower, which doesn't matter at this app's
// scale (one user, a few hundred rows).
//
// To keep scanner.js and server.js simple, this file wraps the WASM driver
// so the rest of the app can keep using the same db.prepare(sql).get/all/run
// style as better-sqlite3.

const { Database } = require('node-sqlite3-wasm');
const path = require('path');

const rawDb = new Database(path.join(__dirname, 'data', 'app.db'));

// Thin compatibility wrapper around node-sqlite3-wasm's statement API so
// the rest of the codebase can call db.prepare(sql).run(...) / .get(...) /
// .all(...) exactly like it would with better-sqlite3.
const db = {
  prepare(sql) {
    return {
      run(...params) {
        return rawDb.run(sql, params);
      },
      get(...params) {
        return rawDb.get(sql, params);
      },
      all(...params) {
        return rawDb.all(sql, params);
      },
    };
  },
  exec(sql) {
    return rawDb.exec(sql);
  },
};

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

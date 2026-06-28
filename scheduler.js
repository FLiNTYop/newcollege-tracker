// scheduler.js — runs the scanner automatically on a timer

const cron = require('node-cron');
const { runScanForAllUsers } = require('./scanner');

function startScheduler() {
  // Runs at minute 0, 15, 30, 45 of every hour — i.e. every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('[scheduler] Triggering scheduled scan...');
    runScanForAllUsers();
  });
  console.log('[scheduler] Scheduled scans every 15 minutes.');
}

module.exports = { startScheduler };

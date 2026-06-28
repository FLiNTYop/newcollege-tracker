// sw.js — minimal service worker.
// Its only job is to exist, which satisfies Android Chrome's requirement
// for a registered service worker before showing the "Install app" prompt.
// It does not cache anything or change how the app behaves.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('fetch', () => {
  // Intentionally do nothing — let all requests pass through to the network normally.
});

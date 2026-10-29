// Receptík no longer sends notifications. Browsers that installed the old
// notification worker fetch this file on their next visit: it removes itself.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});

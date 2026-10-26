// Receptík's service worker: shows "your recipe has been read" notifications
// (sent by lib/push.ts) and opens the right page when one is tapped. When the
// app is open and in front, it shows its own notice instead
// (components/ReadingNotifier.tsx) — except on Apple devices, which require
// every push to show a notification.
self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {}
  event.waitUntil(
    (async () => {
      const apple = /iPhone|iPad|Macintosh/.test(self.navigator.userAgent) && !/Chrome|Android/.test(self.navigator.userAgent);
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (!apple && open.some((c) => c.visibilityState === "visible" && c.focused)) return;
      await self.registration.showNotification(msg.title || "Receptík", {
        body: msg.body || "",
        tag: msg.tag,
        icon: "/brand/icon-192.png",
        badge: "/brand/icon-192.png",
        data: { url: msg.url || "/" },
      });
    })(),
  );
});

// Tapping it: the app, if open, is brought to the front and asked to open
// the page itself (components/ReadingNotifier.tsx) — iPhones don't let the
// service worker navigate it; otherwise the app opens on that page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = open.find((c) => new URL(c.url).origin === self.location.origin);
      if (!client) return self.clients.openWindow(url);
      await client.focus();
      client.postMessage({ type: "open", url, reading: event.notification.tag });
    })(),
  );
});

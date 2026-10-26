// Asking this browser for notifications and subscribing it (lib/push.ts on
// the server; public/sw.js shows them). Browser-only. On iPhones it works
// only in the home-screen app — elsewhere `supported()` is false and the
// in-app notice is all there is.
import { subscribeToPush } from "@/app/actions";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Ask (if not asked yet) and subscribe. Call it straight from a tap: Safari
// asks only then. Never throws; no answer or "no" just means no notifications.
export function enableNotifications(publicKey: string | null): void {
  if (!publicKey || !pushSupported() || Notification.permission === "denied") return;
  const asked = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission();
  asked
    .then(async (answer) => {
      if (answer !== "granted") return;
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
      const json = sub.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
        await subscribeToPush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      }
    })
    .catch(() => {});
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

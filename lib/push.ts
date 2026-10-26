// Phone and browser notifications ("Web Push"): "your recipe has been read",
// for when the person is in another app. On only when the keys are in .env
// (PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY — make them once with
// `npx web-push generate-vapid-keys`; PUSH_CONTACT is a mailto: or https:
// address the push services may use to reach us). On iPhones only the
// home-screen app gets them (Apple's rule). Server-only.
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export const pushPublicKey = () => process.env.PUSH_PUBLIC_KEY || null;

function configured(): boolean {
  const pub = process.env.PUSH_PUBLIC_KEY;
  const priv = process.env.PUSH_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.PUSH_CONTACT || "mailto:admin@example.com", pub, priv);
  return true;
}

export type PushKeys = { endpoint: string; keys: { p256dh: string; auth: string } };

// Remember this browser for the person (again, if it signed in as someone else).
export async function savePushSubscription(userId: string, sub: PushKeys): Promise<void> {
  const data = { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, ...data },
    update: data,
  });
}

// What the service worker (public/sw.js) shows.
export type PushMessage = { title: string; body: string; url: string; tag: string };

// Send to every device of the person. A device that unsubscribed (404/410)
// is forgotten. Never throws: a notification is a courtesy.
export async function notifyUser(userId: string, message: PushMessage): Promise<void> {
  if (!configured()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(message),
          { TTL: 24 * 60 * 60 },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else console.warn(`Push to ${new URL(s.endpoint).host} failed (${status ?? err})`);
      }
    }),
  );
}

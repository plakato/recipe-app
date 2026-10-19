// Periodic tidy-up, run after responses (Next's after()) at most once an hour
// per server process: expired demo guests, expired sessions and ChatGPT sign-ins, IP addresses older than a week, and stored
// photos no recipe uses. Server-only.
import { pruneExpiredSessions } from "@/lib/auth";
import { removeUnusedUploads } from "@/lib/cleanUploads";
import { removeExpiredGuests } from "@/lib/demo";
import { pruneOAuth } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";

const EVERY_MS = 60 * 60 * 1000;
// IP addresses are kept only for the per-network limits, which look back 24
// hours; after a week they're erased (the privacy page says so).
const IP_DAYS = 7;

async function forgetOldIps() {
  const before = new Date(Date.now() - IP_DAYS * 24 * 60 * 60 * 1000);
  await prisma.aiUsage.updateMany({ where: { ip: { not: null }, createdAt: { lt: before } }, data: { ip: null } });
}
let lastRun = 0;

export async function runHousekeeping(): Promise<void> {
  if (Date.now() - lastRun < EVERY_MS) return;
  lastRun = Date.now();
  try {
    // Guests first: their photos then count as unused.
    const guests = await removeExpiredGuests();
    await pruneExpiredSessions();
    await pruneOAuth();
    await forgetOldIps();
    const photos = await removeUnusedUploads();
    if (guests || photos.length) {
      console.info(`Housekeeping: removed ${guests} expired demo(s), ${photos.length} unused photo(s).`);
    }
  } catch (err) {
    console.warn("Housekeeping failed:", err);
  }
}

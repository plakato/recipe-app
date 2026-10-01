// Periodic tidy-up, run after responses (Next's after()) at most once an hour
// per server process: expired demo guests, expired sessions, and stored
// photos no recipe uses. Server-only.
import { pruneExpiredSessions } from "@/lib/auth";
import { removeUnusedUploads } from "@/lib/cleanUploads";
import { removeExpiredGuests } from "@/lib/demo";

const EVERY_MS = 60 * 60 * 1000;
let lastRun = 0;

export async function runHousekeeping(): Promise<void> {
  if (Date.now() - lastRun < EVERY_MS) return;
  lastRun = Date.now();
  try {
    // Guests first: their photos then count as unused.
    const guests = await removeExpiredGuests();
    await pruneExpiredSessions();
    const photos = await removeUnusedUploads();
    if (guests || photos.length) {
      console.info(`Housekeeping: removed ${guests} expired demo(s), ${photos.length} unused photo(s).`);
    }
  } catch (err) {
    console.warn("Housekeeping failed:", err);
  }
}

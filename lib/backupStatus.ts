// Is the nightly backup working? scripts/backup.sh writes the time of its last
// good run to <dir>/last-success and of its last failed one to
// <dir>/last-failure. The stats page warns when the last run failed or no run
// has succeeded for 2 days. Only where BACKUP_STATUS_DIR is set (the server;
// this Mac backs up nothing). Server-only.
import { readFile } from "node:fs/promises";
import path from "node:path";

const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

export type BackupStatus = { lastSuccess: Date | null; problem: string | null };

// The warning, if any, from the two recorded times (pure, for tests).
export function backupProblem(lastSuccess: Date | null, lastFailure: Date | null, now: Date): string | null {
  const day = (d: Date) => d.toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" });
  if (lastFailure && (!lastSuccess || lastFailure > lastSuccess)) {
    return `Posledná záloha zlyhala (${day(lastFailure)}).`;
  }
  if (!lastSuccess) return "Zatiaľ neprebehla žiadna úspešná záloha.";
  if (now.getTime() - lastSuccess.getTime() > MAX_AGE_MS) {
    return `Posledná úspešná záloha bola ${day(lastSuccess)} — viac ako 2 dni.`;
  }
  return null;
}

async function readTime(file: string): Promise<Date | null> {
  try {
    const d = new Date((await readFile(file, "utf8")).trim().split(" ")[0]);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// null where backups aren't expected (no BACKUP_STATUS_DIR).
export async function loadBackupStatus(now = new Date()): Promise<BackupStatus | null> {
  const dir = process.env.BACKUP_STATUS_DIR;
  if (!dir) return null;
  const lastSuccess = await readTime(path.join(dir, "last-success"));
  const lastFailure = await readTime(path.join(dir, "last-failure"));
  return { lastSuccess, problem: backupProblem(lastSuccess, lastFailure, now) };
}

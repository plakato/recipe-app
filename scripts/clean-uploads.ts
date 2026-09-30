// List (or delete) stored photos that no recipe uses — e.g. photos of import
// drafts that were skipped. Recipes in the Trash still count as using theirs.
// The app also does this automatically after imports, at most once an hour.
//
// Run: npx tsx --env-file=.env scripts/clean-uploads.ts [--delete] [--hours N]
//   default: only list what would be removed
//   --delete  actually remove them
//   --hours   only files older than N hours (default 24)
import { prisma } from "@/lib/prisma";
import { removeUnusedUploads } from "@/lib/cleanUploads";

const args = process.argv.slice(2);
const doDelete = args.includes("--delete");
const hoursArg = args.indexOf("--hours");
const hours = hoursArg >= 0 ? Number(args[hoursArg + 1]) : 24;

(async () => {
  const names = await removeUnusedUploads({ dryRun: !doDelete, graceMs: hours * 3600_000 });
  for (const n of names) console.log(n);
  console.log(`\n${names.length} unused photo(s) older than ${hours}h ${doDelete ? "removed" : "found (run with --delete to remove)"}.`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

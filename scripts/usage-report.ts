// Print the daily usage statistics (same numbers as /admin/stats).
//
// Run: npx tsx --env-file=.env scripts/usage-report.ts [days]   (default 1 = today)
import { prisma } from "@/lib/prisma";
import { ACTIVITY_KINDS, TIME_ZONE, loadDailyStats, total } from "@/lib/stats";

const days = Math.max(1, Number(process.argv[2]) || 1);
const usd = (n: number) => `$${n.toFixed(4)}`;
const both = (s: { accounts: number; demo: number }) => `${s.accounts} (+${s.demo} demo)`;

(async () => {
  const stats = await loadDailyStats(days);
  console.log(`Usage, last ${days} day(s), ${TIME_ZONE} time\n`);
  for (const d of [...stats, ...(stats.length > 1 ? [total(stats)] : [])]) {
    console.log(`== ${d.day}`);
    console.log(`  imports ${both(d.imports)}, demos started ${d.demosStarted}, sign-ups ${d.signups}`);
    console.log(`  recipes: ${ACTIVITY_KINDS.map((k) => `${k} ${both(d.activity[k])}`).join(", ")}`);
    console.log(`  AI: ${d.calls} calls, ${d.promptTokens} tokens in / ${d.completionTokens} out, ${usd(d.costUsd)}`);
    for (const m of d.models) {
      console.log(`    ${m.model}: ${m.calls} calls, ${m.promptTokens}/${m.completionTokens} tokens, ${usd(m.costUsd)}`);
    }
  }
  if (stats.length === 0) console.log("Nothing recorded.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

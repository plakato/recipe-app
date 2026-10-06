import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ACTIVITY_KINDS, TIME_ZONE, dayKey, loadDailyStats, total, type DayStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Daily usage statistics, for accounts marked isAdmin (scripts/set-admin.ts).
// Everyone else gets "not found", so the page isn't even revealed.
const usd = (n: number) => `$${n.toFixed(n > 0 && n < 0.01 ? 4 : 2)}`;
const int = (n: number) => n.toLocaleString("en-US");
const both = (s: { accounts: number; demo: number }) =>
  s.accounts + s.demo === 0 ? "–" : s.demo ? `${s.accounts} + ${s.demo} demo` : String(s.accounts);

const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500";
const td = "px-3 py-2 tabular-nums";

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-stone-100 p-4 dark:bg-stone-900">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function ModelTable({ models }: { models: DayStats["models"] }) {
  if (models.length === 0) return <p className="text-sm text-stone-500">No AI calls.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200 dark:border-stone-800">
          <th className={th}>Model</th>
          <th className={`${th} text-right`}>Calls</th>
          <th className={`${th} text-right`}>Tokens in</th>
          <th className={`${th} text-right`}>Tokens out</th>
          <th className={`${th} text-right`}>Cost</th>
        </tr>
      </thead>
      <tbody>
        {models.map((m) => (
          <tr key={m.model} className="border-b border-stone-100 dark:border-stone-900">
            <td className="px-3 py-2 font-mono text-xs">{m.model}</td>
            <td className={`${td} text-right`}>{int(m.calls)}</td>
            <td className={`${td} text-right`}>{int(m.promptTokens)}</td>
            <td className={`${td} text-right`}>{int(m.completionTokens)}</td>
            <td className={`${td} text-right`}>{usd(m.costUsd)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function StatsPage() {
  const user = await requireUser();
  if (!user.isAdmin) notFound();

  const days = await loadDailyStats(30);
  const today = days.find((d) => d.day === dayKey(new Date())) ?? null;
  const month = total(days);
  const edits = (d: DayStats | null) =>
    d ? ACTIVITY_KINDS.reduce((n, k) => n + d.activity[k].accounts + d.activity[k].demo, 0) : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Usage statistics</h1>
        <p className="mt-1 text-sm text-stone-500">Last 30 days · days in {TIME_ZONE} time · “demo” = visitors trying it without an account</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Cost today" value={usd(today?.costUsd ?? 0)} hint={`${int(today?.calls ?? 0)} AI calls`} />
        <Card label="Imports today" value={int((today?.imports.accounts ?? 0) + (today?.imports.demo ?? 0))} hint={`${today?.imports.demo ?? 0} from demos`} />
        <Card label="Recipe changes today" value={int(edits(today))} hint={`${today?.demosStarted ?? 0} demos started`} />
        <Card label="Cost, 30 days" value={usd(month.costUsd)} hint={`${int(month.promptTokens + month.completionTokens)} tokens`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Day by day</h2>
        {days.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <th className={th}>Day</th>
                  <th className={th}>Imports</th>
                  <th className={th}>Created</th>
                  <th className={th}>Edited</th>
                  <th className={th}>Deleted</th>
                  <th className={th}>Demos</th>
                  <th className={`${th} text-right`}>AI calls</th>
                  <th className={`${th} text-right`}>Tokens in / out</th>
                  <th className={`${th} text-right`}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} className="border-b border-stone-100 align-top dark:border-stone-900">
                    <td className={`${td} font-medium`}>{d.day}</td>
                    <td className={td}>{both(d.imports)}</td>
                    <td className={td}>{both(d.activity.created)}</td>
                    <td className={td}>{both(d.activity.edited)}</td>
                    <td className={td}>{both({ accounts: d.activity.deleted.accounts + d.activity.erased.accounts, demo: d.activity.deleted.demo + d.activity.erased.demo })}</td>
                    <td className={td}>{d.demosStarted || "–"}</td>
                    <td className={`${td} text-right`}>{int(d.calls)}</td>
                    <td className={`${td} text-right`}>{int(d.promptTokens)} / {int(d.completionTokens)}</td>
                    <td className={`${td} text-right font-medium`}>{usd(d.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per model, 30 days</h2>
        <ModelTable models={month.models} />
      </section>
    </div>
  );
}

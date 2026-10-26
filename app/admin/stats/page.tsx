import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadBackupStatus } from "@/lib/backupStatus";
import { ACTIVITY_KINDS, TIME_ZONE, dayKey, loadDailyStats, total, waitSummary, type DayStats, type WaitStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Daily usage statistics, for accounts marked isAdmin (scripts/set-admin.ts).
// Everyone else gets "not found", so the page isn't even revealed.
const usd = (n: number) => `$${n.toFixed(n > 0 && n < 0.01 ? 4 : 2)}`;
const int = (n: number) => n.toLocaleString("sk-SK");
const both = (s: { accounts: number; demo: number }) =>
  s.accounts + s.demo === 0 ? "–" : s.demo ? `${s.accounts} + ${s.demo} demo` : String(s.accounts);

// "1 min 25 s" / "40 s".
const secs = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
};
// "50 s / 2 min 10 s", plus the failures: median and longest wait.
const waits = (w: WaitStats) => {
  const s = waitSummary(w);
  const failed = w.failed ? `${w.failed} chyba` : "";
  return s ? `${secs(s.median)} / ${secs(s.longest)}${failed ? ` · ${failed}` : ""}` : failed || "–";
};

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

// The typical (median) wait for a photo import, with the longest and failures.
function WaitCard({ label, w }: { label: string; w?: WaitStats }) {
  const s = w ? waitSummary(w) : null;
  const failed = w?.failed ? ` · ${w.failed} chyba` : "";
  return (
    <Card
      label={label}
      value={s ? secs(s.median) : "–"}
      hint={s ? `bežne · najdlhšie ${secs(s.longest)}${failed}` : failed ? failed.slice(3) : "žiadne čítanie fotiek"}
    />
  );
}

const PURPOSES: Record<string, string> = {
  "read-recipe": "Čítanie receptu (fotka, odkaz)",
  "choose-photos": "Výber a kontrola fotky jedla",
  "describe-dish": "Opis jedla na kreslenie",
  "draw-dish": "Kreslenie obrázka jedla",
  unknown: "Neurčené (staršie záznamy)",
};

function PurposeTable({ purposes }: { purposes: DayStats["purposes"] }) {
  if (purposes.length === 0) return <p className="text-sm text-stone-500">Žiadne volania AI.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-800">
            <th className={th}>Na čo</th>
            <th className={th}>Modely</th>
            <th className={`${th} text-right`}>Volania</th>
            <th className={`${th} text-right`}>z toho skripty</th>
            <th className={`${th} text-right`}>Cena</th>
          </tr>
        </thead>
        <tbody>
          {purposes.map((p) => (
            <tr key={p.purpose} className="border-b border-stone-100 align-top dark:border-stone-900">
              <td className="px-3 py-2">{PURPOSES[p.purpose] ?? p.purpose}</td>
              <td className="px-3 py-2">
                <ul className="space-y-0.5">
                  {p.models.map((m) => (
                    <li key={m.model} className="whitespace-nowrap font-mono text-xs">
                      {m.model}{" "}
                      <span className="text-stone-500">
                        ×{int(m.calls)}
                        {m.costUsd > 0 ? ` · ${usd(m.costUsd)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className={`${td} text-right`}>{int(p.calls)}</td>
              <td className={`${td} text-right`}>{p.scriptCalls ? int(p.scriptCalls) : "–"}</td>
              <td className={`${td} text-right`}>{usd(p.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelTable({ models }: { models: DayStats["models"] }) {
  if (models.length === 0) return <p className="text-sm text-stone-500">Žiadne volania AI.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200 dark:border-stone-800">
          <th className={th}>Model</th>
          <th className={`${th} text-right`}>Volania</th>
          <th className={`${th} text-right`}>Tokeny dnu</th>
          <th className={`${th} text-right`}>Tokeny von</th>
          <th className={`${th} text-right`}>Cena</th>
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

  const [days, backup] = await Promise.all([loadDailyStats(30), loadBackupStatus()]);
  const today = days.find((d) => d.day === dayKey(new Date())) ?? null;
  const month = total(days);
  const edits = (d: DayStats | null) =>
    d ? ACTIVITY_KINDS.reduce((n, k) => n + d.activity[k].accounts + d.activity[k].demo, 0) : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Štatistiky používania</h1>
        <p className="mt-1 text-sm text-stone-500">Posledných 30 dní · dni podľa času {TIME_ZONE} · „demo“ = návštevníci, ktorí to skúšajú bez účtu</p>
      </div>

      {backup?.problem && (
        <p role="alert" className="rounded-lg border border-brick-200 bg-brick-50 px-4 py-3 text-sm text-brick-700 dark:border-brick-900/50 dark:bg-brick-950/30 dark:text-brick-300">
          <strong>Záloha nefunguje.</strong> {backup.problem} Pozrite{" "}
          <code className="text-xs">/srv/recipes/app/backups/backup.log</code> na serveri.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Cena dnes" value={usd(today?.costUsd ?? 0)} hint={`${int(today?.calls ?? 0)} volaní AI`} />
        <Card label="Importy dnes" value={int((today?.imports.accounts ?? 0) + (today?.imports.demo ?? 0))} hint={`z toho ${today?.imports.demo ?? 0} z dema`} />
        <Card label="Zmeny receptov dnes" value={int(edits(today))} hint={`demá: ${today?.demosStarted ?? 0} · registrácie: ${today?.signups ?? 0} · ChatGPT: ${today?.chatgpt ?? 0}`} />
        <Card label="Cena za 30 dní" value={usd(month.costUsd)} hint={`${int(month.promptTokens + month.completionTokens)} tokenov`} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WaitCard label="Čakanie na recept dnes" w={today?.waits} />
        <WaitCard label="Čakanie za 30 dní" w={month.waits} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Volania AI dnes, podľa účelu</h2>
        <PurposeTable purposes={today?.purposes ?? []} />
        <p className="text-xs text-stone-500">„Skripty“ = volania bez účtu: testy a údržba spustené z počítača, nie z aplikácie.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Deň po dni</h2>
        {days.length === 0 ? (
          <p className="text-sm text-stone-500">Zatiaľ nič zaznamenané.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <th className={th}>Deň</th>
                  <th className={th}>Importy</th>
                  <th className={th}>Čakanie</th>
                  <th className={th}>Vytvorené</th>
                  <th className={th}>Upravené</th>
                  <th className={th}>Vymazané</th>
                  <th className={th}>Demá</th>
                  <th className={th}>Registrácie</th>
                  <th className={th}>ChatGPT</th>
                  <th className={`${th} text-right`}>Volania AI</th>
                  <th className={`${th} text-right`}>Tokeny dnu / von</th>
                  <th className={`${th} text-right`}>Cena</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} className="border-b border-stone-100 align-top dark:border-stone-900">
                    <td className={`${td} font-medium`}>{d.day}</td>
                    <td className={td}>{both(d.imports)}</td>
                    <td className={`${td} whitespace-nowrap`}>{waits(d.waits)}</td>
                    <td className={td}>{both(d.activity.created)}</td>
                    <td className={td}>{both(d.activity.edited)}</td>
                    <td className={td}>{both({ accounts: d.activity.deleted.accounts + d.activity.erased.accounts, demo: d.activity.deleted.demo + d.activity.erased.demo })}</td>
                    <td className={td}>{d.demosStarted || "–"}</td>
                    <td className={td}>{d.signups || "–"}</td>
                    <td className={td}>{d.chatgpt || "–"}</td>
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
        <h2 className="text-lg font-semibold">Podľa účelu, 30 dní</h2>
        <PurposeTable purposes={month.purposes} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Podľa modelu, 30 dní</h2>
        <ModelTable models={month.models} />
      </section>
    </div>
  );
}

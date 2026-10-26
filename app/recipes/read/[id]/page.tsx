import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { statusOf } from "@/lib/photoReading";
import { trashReadRecipe } from "@/app/actions";
import RetryReading from "@/components/RetryReading";

export const dynamic = "force-dynamic";

// What one background photo reading saved (lib/photoReading.ts), opened from
// its notification: each recipe to view or delete (one it shouldn't have
// read, or one that looks like a recipe they already have) — or, if the
// reading failed, why, and reading the same photos again.
export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const status = await statusOf(id, user.id);
  if (!status) notFound();

  const link = "text-olive-700 underline-offset-2 hover:underline dark:text-olive-400";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {status.state === "reading" && (
        <>
          <h1 className="font-display text-3xl">Recept sa číta…</h1>
          <p className="text-stone-600 dark:text-stone-400">Keď bude hotový, dáme vám vedieť.</p>
        </>
      )}

      {status.state === "failed" && (
        <>
          <h1 className="font-display text-3xl">Recept sa nepodarilo prečítať</h1>
          <p className="text-stone-600 dark:text-stone-400">{status.error}</p>
          {status.canRetry ? (
            <RetryReading readingId={status.id} />
          ) : (
            <Link href="/recipes/import/photo" className={link}>
              Pridať iné fotky
            </Link>
          )}
        </>
      )}

      {status.state === "done" && (
        <>
          <h1 className="font-display text-3xl">
            {status.recipes.length === 1 ? "Prečítaný recept" : "Prečítané recepty"}
          </h1>
          {status.recipes.length === 0 ? (
            <p className="text-stone-600 dark:text-stone-400">Recepty z týchto fotiek ste už zmazali.</p>
          ) : (
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
              {status.recipes.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${r.id}`} className="font-medium hover:underline">
                      {r.title}
                    </Link>
                    {r.like && (
                      <p className="mt-0.5 text-sm text-stone-500">
                        Vyzerá ako recept{" "}
                        <Link href={`/recipes/${r.like.id}`} className={link}>
                          {r.like.title}
                        </Link>
                        , ktorý už máte.
                      </p>
                    )}
                  </div>
                  <Link href={`/recipes/${r.id}`} className="text-sm font-medium text-olive-700 hover:underline dark:text-olive-400">
                    Zobraziť
                  </Link>
                  <form action={trashReadRecipe}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="reading" value={status.id} />
                    <button type="submit" className="text-sm font-medium text-brick-600 hover:underline dark:text-brick-300">
                      Zmazať
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-stone-500">
            Zmazané recepty nájdete v{" "}
            <Link href="/trash" className={link}>
              koši
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

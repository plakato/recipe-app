import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentViewer } from "@/lib/showcase";
import { groupSections, parseList } from "@/lib/recipes";
import RecipeImage from "@/components/RecipeImage";
import DeleteButton from "@/components/DeleteButton";
import { turnstileSiteKey } from "@/lib/turnstile";
import { BackIcon, EditIcon, LinkIcon } from "@/components/Icons";
import ScanViewer from "@/components/ScanViewer";
import { visibleRecipes } from "@/lib/features";
import { isBeingDrawn } from "@/lib/dishImage";
import { keepReadRecipe } from "@/app/actions";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

// Round, translucent icon buttons that sit on top of the hero image.
const heroBtn =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/60";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Signed in: your recipes. Otherwise the public showcase, read-only.
  const viewer = await currentViewer();
  // No public browsing (no showcase account): visitors must sign in.
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/recipes/${id}`)}`);
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: viewer.userId, deletedAt: null, ...visibleRecipes },
  });
  if (!recipe) notFound();

  const ingredients = groupSections(parseList(recipe.ingredients));
  const instructions = groupSections(parseList(recipe.instructions));
  // Photo recipes keep the photos they were read from (the scans); the picture
  // shown is the dish, cropped from them or generated.
  const scans = parseList(recipe.scanPaths);
  const drawing = isBeingDrawn(recipe);
  // Read from photos and not kept yet (the photo page's list): reviewed here,
  // edited if something is wrong, then kept.
  const draft = !!recipe.readingId;
  const back = draft ? "/recipes/import/photo" : "/";

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      {draft && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-olive-200 bg-olive-50 px-4 py-3 dark:border-olive-900/50 dark:bg-olive-950/30">
          <p className="min-w-0 flex-1 basis-60 text-sm text-olive-900 dark:text-olive-200">
            Recept ešte nie je uložený – upravte ho alebo uložte.
          </p>
          <Link
            href={back}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-white/60 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Späť na pridávanie receptov
          </Link>
          <form action={keepReadRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-olive-600 px-4 py-2 text-sm font-medium text-white hover:bg-olive-700"
            >
              <Check className="h-4 w-4" /> Uložiť recept
            </button>
          </form>
        </div>
      )}
      {/* Hero: image with the title over a bottom shadow, controls on top. */}
      <header>
        <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
          <RecipeImage
            src={recipe.imagePath}
            seed={recipe.id}
            alt={recipe.title}
            className="aspect-[4/3] w-full sm:aspect-[16/9]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          <h1 className="font-display absolute inset-x-0 bottom-0 p-5 text-3xl font-medium leading-tight text-white drop-shadow sm:p-8 sm:text-5xl">
            {recipe.title}
          </h1>
          {drawing && (
            <p className="absolute inset-x-0 top-1/3 text-center text-sm text-stone-600 dark:text-stone-300">
              Kreslíme obrázok jedla… o chvíľu obnovte stránku.
            </p>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
            <Link
              href={back}
              title={draft ? "Späť na pridávanie receptov" : "Všetky recepty"}
              aria-label={draft ? "Späť na pridávanie receptov" : "Všetky recepty"}
              className={heroBtn}
            >
              <BackIcon />
            </Link>
            <div className="flex items-center gap-2">
              {recipe.sourceUrl ? (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Otvoriť pôvodnú stránku"
                  aria-label="Otvoriť pôvodnú stránku"
                  className={heroBtn}
                >
                  <LinkIcon />
                </a>
              ) : (
                scans.length > 0 && <ScanViewer scans={scans} className={heroBtn} />
              )}
              {/* Owners edit their recipe. Visitors get the same buttons: their demo
                  starts on save/delete (background bot check), on their own copy. */}
              <Link href={`/recipes/${recipe.id}/edit`} title="Upraviť" aria-label="Upraviť" className={heroBtn}>
                <EditIcon />
              </Link>
              <DeleteButton id={recipe.id} className={heroBtn} botCheckKey={viewer.signedIn ? null : turnstileSiteKey()} />
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-stone-900 dark:ring-white/10">
          <h2 className="font-display mb-4 text-2xl">Suroviny</h2>
          {ingredients.length ? (
            <div className="space-y-5">
              {ingredients.map((section, si) => (
                <div key={si}>
                  {section.heading && (
                    <h3 className="font-display mb-2 text-lg text-olive-800 dark:text-olive-300">
                      {section.heading}
                    </h3>
                  )}
                  <ul className="space-y-2 text-stone-800 dark:text-stone-200">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-olive-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">Neuvedené.</p>
          )}
        </div>

        <div className="px-1">
          <h2 className="font-display mb-4 text-2xl">Postup</h2>
          {instructions.length ? (
            <div className="space-y-7">
              {instructions.map((section, si) => (
                <div key={si}>
                  {section.heading && (
                    <h3 className="font-display mb-3 text-lg text-olive-800 dark:text-olive-300">
                      {section.heading}
                    </h3>
                  )}
                  <ol className="space-y-5">
                    {section.items.map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="font-display w-8 flex-none text-3xl leading-none text-olive-600/80 dark:text-olive-400/80">
                          {i + 1}
                        </span>
                        <p className="pt-1 leading-relaxed text-stone-800 dark:text-stone-200">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">Neuvedené.</p>
          )}
        </div>
      </section>

    </article>
  );
}

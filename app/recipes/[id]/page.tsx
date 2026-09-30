import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { groupSections, parseList } from "@/lib/recipes";
import { softDeleteRecipe } from "@/app/actions";
import RecipeImage from "@/components/RecipeImage";
import { getShadowColors, titleShade } from "@/lib/imageColor";
import { BackIcon, EditIcon, LinkIcon, PhotoIcon, TrashIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

// Round, translucent icon buttons that sit on top of the hero image.
const heroBtn =
  "flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/60";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!recipe) notFound();

  const ingredients = groupSections(parseList(recipe.ingredients));
  const instructions = groupSections(parseList(recipe.instructions));
  const isPhoto = recipe.sourceType === "photo" && !!recipe.imagePath;
  const sourceHref = recipe.sourceUrl ?? (isPhoto ? recipe.imagePath : null);
  const shade = titleShade(
    recipe.imagePath ? (await getShadowColors([recipe.imagePath])).get(recipe.imagePath) : undefined,
  );
  const sourceLabel = recipe.sourceUrl ? "Open the original page" : "Open the original photo";

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      {/* Hero: image with the title over a shadow in the photo's own colour,
          controls on top. */}
      <header>
        <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
          <RecipeImage
            src={recipe.imagePath}
            seed={recipe.id}
            alt={recipe.title}
            className="aspect-[4/3] w-full sm:aspect-[16/9]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3" style={{ background: shade }} />
          <h1 className="font-display absolute inset-x-0 bottom-0 p-5 text-3xl font-medium leading-tight text-white sm:p-8 sm:text-5xl">
            {recipe.title}
          </h1>
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
            <Link href="/" title="All recipes" aria-label="All recipes" className={heroBtn}>
              <BackIcon />
            </Link>
            <div className="flex items-center gap-2">
              {sourceHref && (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={sourceLabel}
                  aria-label={sourceLabel}
                  className={heroBtn}
                >
                  {recipe.sourceUrl ? <LinkIcon /> : <PhotoIcon />}
                </a>
              )}
              <Link href={`/recipes/${recipe.id}/edit`} title="Edit" aria-label="Edit" className={heroBtn}>
                <EditIcon />
              </Link>
              <form action={softDeleteRecipe}>
                <input type="hidden" name="id" value={recipe.id} />
                <button type="submit" title="Move to Trash" aria-label="Move to Trash" className={heroBtn}>
                  <TrashIcon />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-stone-900 dark:ring-white/10">
          <h2 className="font-display mb-4 text-2xl">Ingredients</h2>
          {ingredients.length ? (
            <div className="space-y-5">
              {ingredients.map((section, si) => (
                <div key={si}>
                  {section.heading && (
                    <h3 className="font-display mb-2 text-lg italic text-blush-800 dark:text-blush-300">
                      {section.heading}
                    </h3>
                  )}
                  <ul className="space-y-2 text-stone-800 dark:text-stone-200">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-blush-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">None listed.</p>
          )}
        </div>

        <div className="px-1">
          <h2 className="font-display mb-4 text-2xl">Steps</h2>
          {instructions.length ? (
            <div className="space-y-7">
              {instructions.map((section, si) => (
                <div key={si}>
                  {section.heading && (
                    <h3 className="font-display mb-3 text-lg italic text-blush-800 dark:text-blush-300">
                      {section.heading}
                    </h3>
                  )}
                  <ol className="space-y-5">
                    {section.items.map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="font-display w-8 flex-none text-3xl leading-none text-blush-600/80 dark:text-blush-400/80">
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
            <p className="text-sm text-stone-500">None listed.</p>
          )}
        </div>
      </section>
    </article>
  );
}

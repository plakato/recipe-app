import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import RecipeImage from "@/components/RecipeImage";
import { PlusIcon } from "@/components/Icons";

// Always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUserId();
  const recipes = await prisma.recipe.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (recipes.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-3xl">Nothing here yet.</p>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-amber-700"
        >
          <PlusIcon /> Add your first recipe
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-stone-200 shadow-sm ring-1 ring-black/5 transition hover:shadow-lg dark:bg-stone-800 dark:ring-white/10"
          >
            <RecipeImage
              src={recipe.imagePath}
              alt=""
              className="h-full w-full"
              imgClassName="transition duration-500 group-hover:scale-105"
            />
            {/* Shadow rising from the bottom so the title stays readable. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
            {/* Padding on the h2, clamp on the inner span: with both on one
                element the clipped third line shows through the padding. */}
            <h2 className="font-display absolute inset-x-0 bottom-0 p-3 text-base font-medium leading-snug text-white drop-shadow sm:p-4 sm:text-xl">
              <span className="line-clamp-2">{recipe.title}</span>
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}

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
        <span className="text-6xl">🍳</span>
        <p className="font-display text-3xl">Nothing cooking yet.</p>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 rounded-full bg-blush-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-blush-700"
        >
          <PlusIcon /> Add your first recipe
        </Link>
      </div>
    );
  }

  // Instagram-style grid: square tiles, hairline gaps, edge to edge on phones.
  // Titles sit on a frosted cream label so they read on any photo.
  return (
    <ul className="-mx-4 -mt-6 grid grid-cols-3 gap-0.5 sm:mx-0 sm:mt-0 sm:gap-1 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link href={`/recipes/${recipe.id}`} className="group relative block">
            <RecipeImage
              seed={recipe.id}
              src={recipe.imagePath}
              alt=""
              className="aspect-square w-full"
              imgClassName="transition duration-500 group-hover:scale-105"
            />
            <h2 className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-[var(--background)]/80 px-2 py-1 text-[11px] font-medium leading-snug text-stone-900 shadow-sm backdrop-blur-md transition group-hover:bg-[var(--background)]/95 sm:inset-x-2.5 sm:bottom-2.5 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm dark:text-stone-100">
              <span className="line-clamp-2">{recipe.title}</span>
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}

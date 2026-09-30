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
          className="flex items-center gap-2 rounded-full bg-sage-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-sage-700"
        >
          <PlusIcon /> Add your first recipe
        </Link>
      </div>
    );
  }

  // Instagram-style grid: square tiles, hairline gaps, edge to edge on phones;
  // titles sit under the photos so they stay readable.
  return (
    <ul className="-mx-4 -mt-6 grid grid-cols-3 gap-x-0.5 sm:mx-0 sm:mt-0 sm:gap-x-1 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link href={`/recipes/${recipe.id}`} className="group block">
            <RecipeImage
              seed={recipe.id}
              src={recipe.imagePath}
              alt=""
              className="aspect-square w-full"
              imgClassName="transition duration-500 group-hover:scale-105"
            />
            <h2 className="px-2 pb-3 pt-1.5 text-xs font-medium leading-snug text-stone-800 group-hover:text-sage-700 sm:px-0.5 sm:text-sm dark:text-stone-200 dark:group-hover:text-sage-300">
              <span className="line-clamp-2">{recipe.title}</span>
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}

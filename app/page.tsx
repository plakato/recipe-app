import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import RecipeImage from "@/components/RecipeImage";
import { CookingPot } from "lucide-react";
import { PlusIcon } from "@/components/Icons";
import { visibleRecipes } from "@/lib/features";

// Always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUserId();
  const recipes = await prisma.recipe.findMany({
    where: { userId, deletedAt: null, ...visibleRecipes },
    orderBy: { createdAt: "desc" },
  });

  if (recipes.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CookingPot className="h-14 w-14 text-stone-300" strokeWidth={1.5} />
        <p className="font-display text-3xl">Nothing cooking yet.</p>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white hover:bg-olive-700"
        >
          <PlusIcon /> Add your first recipe
        </Link>
      </div>
    );
  }

  // Bento grid: the newest recipe takes a 2×2 tile, the rest are squares.
  // Titles sit on a dark shadow rising from the bottom of each photo.
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {recipes.map((recipe, i) => (
        <li key={recipe.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="group relative block aspect-square overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800"
          >
            <RecipeImage
              seed={recipe.id}
              src={recipe.imagePath}
              alt=""
              className="h-full w-full"
              imgClassName="transition duration-500 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
            {/* Padding on the h2, clamp on the inner span: with both on one
                element the clipped third line shows through the padding. */}
            <h2
              className={`absolute inset-x-0 bottom-0 font-semibold leading-snug text-white ${
                i === 0 ? "p-4 text-xl sm:p-5 sm:text-3xl" : "p-3 text-sm"
              }`}
            >
              <span className="line-clamp-2">{recipe.title}</span>
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}


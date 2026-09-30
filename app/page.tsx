import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import RecipeImage from "@/components/RecipeImage";
import { PlusIcon } from "@/components/Icons";
import { getShadowColors, titleShade } from "@/lib/imageColor";

// Always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUserId();
  const recipes = await prisma.recipe.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const shadows = await getShadowColors(
    recipes.flatMap((r) => (r.imagePath ? [r.imagePath] : [])),
  );

  if (recipes.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="text-6xl">🍳</span>
        <p className="font-display text-3xl">Nothing cooking yet.</p>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 rounded-full bg-blush-300 px-5 py-2.5 font-medium text-blush-950 shadow-sm hover:bg-blush-400"
        >
          <PlusIcon /> Add your first recipe
        </Link>
      </div>
    );
  }

  // Instagram-style grid: square tiles, hairline gaps, edge to edge on phones.
  // Titles sit on a shadow tinted with the photo's own bottom colour.
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
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
              style={{ background: titleShade(shadows.get(recipe.imagePath ?? "")) }}
            />
            {/* Padding on the h2, clamp on the inner span: with both on one
                element the clipped third line shows through the padding. */}
            <h2 className="font-display absolute inset-x-0 bottom-0 p-2 text-xs font-medium leading-snug text-white sm:p-3 sm:text-base lg:text-lg">
              <span className="line-clamp-2">{recipe.title}</span>
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}


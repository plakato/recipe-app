import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/showcase";
import RecipeGrid from "@/components/RecipeGrid";
import { CookingPot } from "lucide-react";
import { PlusIcon } from "@/components/Icons";
import { visibleRecipes } from "@/lib/features";
import { parseList } from "@/lib/recipes";
import { searchText } from "@/lib/recipeSearch";

// Always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Signed in: your recipes. Otherwise the public showcase, read-only.
  const viewer = await currentViewer();
  if (!viewer) redirect("/login");
  const recipes = await prisma.recipe.findMany({
    where: { userId: viewer.userId, deletedAt: null, ...visibleRecipes },
    orderBy: { createdAt: "desc" },
  });

  if (recipes.length === 0 && viewer.signedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CookingPot className="h-14 w-14 text-stone-300" strokeWidth={1.5} />
        <p className="font-display text-3xl">Zatiaľ tu nič nevarí.</p>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white hover:bg-olive-700"
        >
          <PlusIcon /> Pridajte svoj prvý recept
        </Link>
      </div>
    );
  }

  const chatgpt = viewer.signedIn
    ? !!(await prisma.oAuthToken.findFirst({ where: { userId: viewer.userId, expiresAt: { gt: new Date() } } }))
    : false;
  return (
    <RecipeGrid
      chatgpt={chatgpt}
      recipes={recipes.map((r) => ({
        id: r.id,
        title: r.title,
        imagePath: r.imagePath,
        search: searchText(r.title, parseList(r.ingredients)),
      }))}
    />
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/showcase";
import RecipeGrid from "@/components/RecipeGrid";
import { CookingPot } from "lucide-react";
import { PlusIcon } from "@/components/Icons";
import { listedRecipes } from "@/lib/features";
import { parseList } from "@/lib/recipes";
import { searchText } from "@/lib/recipeSearch";

// Always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Signed in: your recipes. Otherwise the public showcase, read-only.
  const viewer = await currentViewer();
  if (!viewer) redirect("/login");
  const recipes = await prisma.recipe.findMany({
    where: { userId: viewer.userId, deletedAt: null, ...listedRecipes },
    orderBy: { createdAt: "desc" },
  });
  // Read from photos, waiting on the photo page to be kept.
  const drafts = viewer.signedIn
    ? await prisma.recipe.count({ where: { userId: viewer.userId, deletedAt: null, readingId: { not: null } } })
    : 0;
  const waiting = drafts > 0 && (
    <Link
      href="/recipes/import/photo"
      className="mb-4 block rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm font-medium text-olive-900 hover:bg-olive-100 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200"
    >
      {drafts === 1
        ? "1 prečítaný recept čaká"
        : drafts < 5
          ? `${drafts} prečítané recepty čakajú`
          : `${drafts} prečítaných receptov čaká`}{" "}
      na uloženie →
    </Link>
  );

  if (recipes.length === 0 && viewer.signedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        {waiting}
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
    <>
      {waiting}
      <RecipeGrid
      chatgpt={chatgpt}
      recipes={recipes.map((r) => ({
        id: r.id,
        title: r.title,
        imagePath: r.imagePath,
        search: searchText(r.title, parseList(r.ingredients)),
      }))}
      />
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import { updateRecipe } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { currentViewer } from "@/lib/showcase";
import { turnstileSiteKey } from "@/lib/turnstile";
import { recipeToDraft } from "@/lib/recipes";
import { visibleRecipes } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Owners edit their recipe; visitors see the showcase recipe and, on save,
  // get their demo with their own copy of it (app/actions.ts → updateRecipe).
  const viewer = await currentViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/recipes/${id}/edit`)}`);
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: viewer.userId, deletedAt: null, ...visibleRecipes },
  });

  if (!recipe) notFound();
  // A draft read from photos (the photo page's list): saving keeps it.
  const draft = !!recipe.readingId;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl">{draft ? "Skontrolovať recept" : "Upraviť recept"}</h1>
      <RecipeForm
        action={updateRecipe}
        initial={recipeToDraft(recipe)}
        recipeId={recipe.id}
        sourceType={recipe.sourceType}
        submitLabel={draft ? "Uložiť recept" : "Uložiť zmeny"}
        botCheckKey={viewer.signedIn ? null : turnstileSiteKey()}
        secondaryAction={
          draft ? (
            <Link
              href="/recipes/import/photo"
              className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Späť
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}

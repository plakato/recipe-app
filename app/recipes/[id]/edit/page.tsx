import { notFound } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import { updateRecipe } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { recipeToDraft } from "@/lib/recipes";
import { visibleRecipes } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId, deletedAt: null, ...visibleRecipes },
  });

  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl">Edit recipe</h1>
      <RecipeForm
        action={updateRecipe}
        initial={recipeToDraft(recipe)}
        recipeId={recipe.id}
        sourceType={recipe.sourceType}
        submitLabel="Save changes"
      />
    </div>
  );
}

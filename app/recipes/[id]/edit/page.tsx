import { notFound } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import { updateRecipe } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { recipeToDraft } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getDefaultUserId();
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!recipe) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit recipe</h1>
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

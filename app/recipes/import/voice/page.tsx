import Link from "next/link";
import VoiceImport from "@/components/VoiceImport";

export default function ImportByVoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add by voice</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Press record and say the recipe out loud — the title, the ingredients,
          then the steps. Edit the transcript if needed, then let the AI turn it
          into a recipe for you to review.
        </p>
      </div>

      <VoiceImport />

      <Link
        href="/recipes/new"
        className="inline-block text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
      >
        ← Enter by hand instead
      </Link>
    </div>
  );
}

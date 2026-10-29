import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getShowcaseUserId } from "@/lib/showcase";
import { turnstileSiteKey } from "@/lib/turnstile";
import { URL_IMPORT_ENABLED } from "@/lib/features";
import PhotoImport from "@/components/PhotoImport";
import { readingList } from "@/lib/photoReading";

export const dynamic = "force-dynamic";

export default async function ImportFromPhotoPage() {
  // Visitors may try it too (their demo starts with the first reading);
  // without public browsing they need to sign in.
  const user = await getSessionUser();
  const signedIn = !!user;
  if (!signedIn && !(await getShowcaseUserId())) redirect("/login?next=%2Frecipes%2Fimport%2Fphoto");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Z fotky</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Odfoťte stránku z kuchárky, ručne písaný recept alebo snímku obrazovky.
        </p>
      </div>

      <PhotoImport botCheckKey={signedIn ? null : turnstileSiteKey()} readings={user ? await readingList(user.id) : []} />

      {/* With link import paused, photo is the only way to add: no chooser. */}
      {URL_IMPORT_ENABLED && (
        <Link
          href="/recipes/new"
          className="inline-block text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Iné spôsoby pridania
        </Link>
      )}
    </div>
  );
}

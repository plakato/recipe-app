// A background photo reading's state (lib/photoReading.ts) and what to tell
// the person about it — the same words in the phone notification and the
// in-app notice (components/ReadingNotifier.tsx). Shared by server and browser.

export type ReadingStatus =
  | { id: string; state: "reading" }
  | {
      id: string;
      state: "done";
      // like: an older recipe it resembles (title), shown next to it.
      recipes: { id: string; title: string; like?: { id: string; title: string } }[];
    }
  | { id: string; state: "failed"; error: string; canRetry: boolean };

// What to tell the person about a finished reading: the phone notification
// and the in-app notice say the same. One recipe and nothing to decide: it
// opens the recipe; otherwise the reading's page.
export function notice(s: ReadingStatus): { title: string; body: string; url: string } {
  const page = `/recipes/read/${s.id}`;
  if (s.state === "failed") return { title: "Recept sa nepodarilo prečítať", body: s.error, url: page };
  if (s.state === "reading") return { title: "Recept sa číta…", body: "", url: page };
  const titles = s.recipes.map((r) => r.title).join(", ");
  const likeOne = s.recipes.some((r) => r.like);
  const like = s.recipes.length > 1 ? "jeden z nich vyzerá ako recept" : "vyzerá ako recept";
  const body = likeOne ? `${titles} — ${like}, ktorý už máte.` : titles;
  if (s.recipes.length === 0) return { title: "Prečítané recepty ste už zmazali", body: "", url: "/" };
  if (s.recipes.length === 1) {
    return { title: "Recept je prečítaný", body, url: likeOne ? page : `/recipes/${s.recipes[0].id}` };
  }
  const n = s.recipes.length;
  return { title: `Prečítané: ${n} ${n < 5 ? "recepty" : "receptov"}`, body, url: page };
}

// One line of the photo page's reading list (lib/photoReading.ts →
// readingList, components/ReadingList.tsx). Shared by server and browser.
export type ReadingItem =
  // Still reading; title once it has been read (null: not yet).
  | { kind: "reading"; key: string; title: string | null }
  | { kind: "failed"; key: string; readingId: string; error: string; canRetry: boolean }
  // A draft to review or keep; like: an older recipe it resembles.
  | {
      kind: "ready";
      key: string;
      id: string;
      title: string;
      imagePath: string | null;
      like?: { id: string; title: string };
    };

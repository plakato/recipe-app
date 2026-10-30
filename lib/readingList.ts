// One line of the photo page's reading list (lib/photoReading.ts →
// readingList, components/ReadingList.tsx). Shared by server and browser.
// readingId: the reading it belongs to (the AiUsage "wait" row); at: when
// that started (ms, the server's clock).
type Line = { key: string; readingId: string; at: number };
export type ReadingItem = Line &
  (
    | // Still reading; title once it has been read (null: not yet).
    { kind: "reading"; title: string | null }
    | { kind: "failed"; error: string; canRetry: boolean }
    // A draft to review or keep; like: an older recipe it resembles.
    | { kind: "ready"; id: string; title: string; imagePath: string | null; like?: { id: string; title: string } }
  );

// The list as the server sends it, with its clock (ms), to line its times up
// with the browser's.
export type ReadingListData = { items: ReadingItem[]; now: number };

// Photos being sent from this page (components/PhotoImport.tsx), before the
// server has them: shown above the list. readingId once they have arrived
// (the list's own line then takes over); error if sending failed.
export type Sending = {
  key: string;
  files: File[];
  at: number; // when sent (ms, the browser's clock)
  progress: number; // 0–100
  error: string | null;
  readingId: string | null;
};

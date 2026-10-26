// The background readings this browser started (lib/photoReading.ts) and
// hasn't shown the result of yet, kept in localStorage so the in-app notice
// (components/ReadingNotifier.tsx) still comes after a reload or the next
// time the app is opened. Browser-only; storage may be unavailable (private
// mode), then the phone notification is all there is.
const KEY = "pendingReadings";
export const READINGS_CHANGED = "readings-changed";

export function pendingReadings(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-20)));
  } catch {}
  window.dispatchEvent(new Event(READINGS_CHANGED));
}

export const addPendingReading = (id: string) => save([...pendingReadings().filter((x) => x !== id), id]);
export const removePendingReading = (id: string) => save(pendingReadings().filter((x) => x !== id));

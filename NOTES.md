# Project notes & deferred work

Running list of things we've decided to do later, so they don't get lost.

## Deferred features

- **Photo/voice: "reading finished" notification.**
  AI reading of a photo (and extraction in general) is slow on free models
  (~1–2 min). Add a notification when extraction finishes so the user doesn't
  have to watch the spinner — e.g. a browser notification (Notification API) or
  a clear in-page "done" state with a sound. (Requested 2026-07-20.)

- **AI-generated recipe image.**
  Replace the 🍽️ placeholder (`components/RecipeImage.tsx`) with an image
  generated from the recipe when no photo is available.

- **Duplicate recipe check.**
  Detect when a recipe being added (from photo, URL, voice, or by hand) already
  exists in the database — e.g. same or very similar title — and warn before
  saving, or offer to open the existing one. Needed before bulk-importing the
  family recipe photos. (Requested 2026-09-23.)

## Phase 5 (going live) — still to do

- Deploy to the Hermes server.
- **Database backups** — DONE on this Mac (2026-09-23): `scripts/backup.sh`
  copies a SQLite snapshot, the photos and a JSON/Markdown export
  (`scripts/export-recipes.ts`) to Google Drive via rclone, nightly at 02:30
  (`scripts/com.recipe-app.backup.plist`, installed into `~/Library/LaunchAgents`). Log: `backups/backup.log`.
  Still to do: re-create the schedule on the Hermes server after deploying, and
  **create our own Google client ID for rclone** — rclone's shared one is being
  retired during 2026 (https://rclone.org/drive/#making-your-own-client-id).
- Single shared site password at the reverse proxy while single-user.
- Push the git repo to a private GitHub remote (also acts as off-machine
  backup of the code — not the database).

## Known limitations

- **Handwriting OCR is weak** on the free vision models. Printed/clear photos
  work well; messy handwriting often misreads. Better quality would need a
  stronger (paid) vision model — deferred by the "free models only" rule.
- Some big recipe sites (AllRecipes, Sally's Baking) block server-side URL
  fetches with a 403 — use photo import for those.
- **Photo uploads** are downscaled to 2000px JPEG (`lib/saveImage.ts`) to avoid
  out-of-memory errors and huge payloads; the Server Action body limit is
  raised to 12mb (`next.config.ts`). HEIC is decoded by `heic-convert` (WASM),
  which still loads the full image — extremely large HEICs (e.g. 48MP) could in
  theory still strain memory; typical 12MP phone photos are fine. sharp here
  can't decode HEIC (libvips has no HEVC plugin), so it's only used to resize.

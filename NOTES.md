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
  saving, or offer to open the existing one. (Requested 2026-09-23.)

- **Test the duplicate warning by hand** (added 2026-09-24): on Add recipe,
  paste an existing recipe's ingredients + steps under a new title and save;
  expect the amber "looks very similar" box with Save anyway; same title +
  same content should demand a rename. Then delete the test recipe from Trash.

- **Multi-recipe import review ("1 of N" walk-through).**
  The extractor can return several recipes from one source
  (`extractRecipesFromText/Image`); the bulk scripts use it. The import pages
  still assume one draft. Plan: keep the existing form and add a "Recipe 2 of
  5" strip with Save & next / Skip. (Discussed 2026-09-23.)

- **Social sign-in (Google / Facebook).** Deferred; email + password only for
  now. Would need OAuth callback routes and developer-console setup.

- **Review the 2026-09-23 bulk import.** 86 recipes came in from photos and
  Chrome bookmarks. Known gaps: chocolate-mousse video has ingredients but no
  steps; "Ovocné kože" article has steps but no ingredients; red-lentil soup
  and živánska photos have little/no method on the page. Bookmarks that could
  not be imported: soufflebombay brownie cookies (403), daybyme apple cake
  (404), Taste of Home AMP link, and five index/article pages.

## Phase 5 (going live) — still to do

- Deploy to the Hermes server.
- **Database backups** — DONE on this Mac (2026-09-23): `scripts/backup.sh`
  copies a SQLite snapshot, the photos and a JSON/Markdown export
  (`scripts/export-recipes.ts`) to Google Drive via rclone, nightly at 02:30
  (installed with `scripts/install-backup-schedule.sh`). Log: `backups/backup.log`.
  Still to do: re-create the schedule on the Hermes server after deploying, and
  **create our own Google client ID for rclone** — rclone's shared one is being
  retired during 2026 (https://rclone.org/drive/#making-your-own-client-id).
- ~~Single shared site password~~ → replaced by per-user accounts (email +
  password, invite-only sign-up) on 2026-09-23. Social logins (Google/Facebook)
  deliberately deferred.
- ~~Push to GitHub~~ — DONE 2026-09-23: public repo
  https://github.com/plakato/recipe-app (history scrubbed of machine name /
  home path). Rule: commit locally, push only when asked.

## Known limitations

- **Free vision models are unreliable for batches**: Google's free pool is
  often rate-limited upstream, and free models come and go on OpenRouter (the
  old fallback vanished). `google/gemini-2.5-flash` (opt-in, ~0.1¢ per photo)
  read all handwritten photos cleanly on 2026-09-23. Free-only remains the
  default for the app; use the paid model for bulk work.
- Some big recipe sites (AllRecipes, Sally's Baking) block server-side URL
  fetches with a 403 — use photo import for those.
- **Photo uploads** are downscaled to 3000px JPEG (`lib/saveImage.ts`) to avoid
  out-of-memory errors and huge payloads; the Server Action body limit is
  raised to 12mb (`next.config.ts`). HEIC is decoded by `heic-convert` (WASM),
  which still loads the full image — extremely large HEICs (e.g. 48MP) could in
  theory still strain memory; typical 12MP phone photos are fine. sharp here
  can't decode HEIC (libvips has no HEVC plugin), so it's only used to resize.

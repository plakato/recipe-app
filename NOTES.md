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

## Phase 5 (going live) — still to do

- Deploy to the Hermes server.
- **Database backups** (critical — "precious family recipes"). See the backup
  plan: soft-delete (done), automated off-site copy of `prisma/dev.db`,
  periodic human-readable JSON/Markdown export.
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

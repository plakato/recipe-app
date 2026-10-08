# Project notes & deferred work

Running list of things we've decided to do later, so they don't get lost.

## Roadmap to a public app (agreed 2026-09-30)

The app's interface is in Slovak (2026-10-06); the prompts to the AI models
stay in English. Scripts' console output is English.

Focus: photo import that works flawlessly, safely open to everyone. Adding by
link is paused (`URL_IMPORT_ENABLED` in `lib/features.ts`); the 132 link
recipes are hidden, not deleted. In order:

1. ~~**Spending caps + friendly errors.**~~ — DONE 2026-09-30: `lib/aiBudget.ts`
   (usage in the `AiUsage` table; limits overridable in .env: `AI_IMPORTS_*`,
   `AI_PAID_USD_PER_MONTH/DAY`), `lib/userErrors.ts`, `app/error.tsx`,
   `app/not-found.tsx`. Imports now verify the session (the proxy only checks
   a cookie exists); an expired cookie no longer loops between / and /login.
   A paid read of a handwritten card cost ~$0.0014.
   - Budget: **$5/month** of paid AI; **10 imports/day per account, 3 per
     anonymous visitor**; a global daily cap. Paid model only as a hidden,
     capped fallback — drop the user-facing "better reading" (paid) toggle.
   - Every failure shows a kind apology ("busy — try again in a few minutes",
     "today's limit reached — sign up / come back tomorrow"), never provider
     errors. Add proper not-found/error pages.
   - Also set the monthly spend limit on the OpenRouter key (dashboard) as the
     hard stop.
2. ~~**Public browsing.**~~ — DONE 2026-09-30 (`lib/showcase.ts`): on when an
   account is marked as the showcase in the database — no email in config:
   `npx tsx --env-file=.env scripts/set-showcase.ts you@example.com`
   (`--off` to stop; run it once on the server).
   Note: in development, files in public/uploads are served statically, so
   any photo URL opens without an account there; production serves photos
   through `app/uploads/[name]/route.ts`, which allows visitors only the
   showcase recipes' photos. It is 20 photo recipes (not 40 — that counted
   a test account's copies).
   Was: **Public browsing.** Anyone opening the site sees Patricia's **40 photo
   recipes** read-only, scans available on click as now. No account, nothing
   stored. **Not indexed by search engines for now** (`noindex`; reconsider
   later — copyright of cookbook scans, personal notes on cards).
3. ~~**Trying it without an account.**~~ — DONE 2026-10-01 (`lib/demo.ts`,
   `/demo`): the first edit/delete/add asks to start the demo; the visitor
   gets a temporary guest account (User.isGuest) with copies of the showcase
   recipes (Recipe.copiedFromId; photos shared, not copied), signed in by
   cookie. Kept a day after last use (extended as they use it), then deleted
   by the hourly housekeeping (`lib/housekeeping.ts`); "Leave the demo"
   deletes it at once; signing up converts it into the real account. Limits:
   10 new demos per IP / 500 per day (`DEMO_GUESTS_*`), 3 imports per demo.
   2026-10-06: no "Try it" page any more — /demo starts the demo by itself
   as soon as the invisible bot check is done (~2 s) and goes straight to
   the edit/add page; a note fixed at the bottom of every page says "Unless
   you sign in, you're in demo mode — the changes you make won't be saved."
   (shown to visitors and demo guests, not to real accounts).
   Was: **Trying it without an account.** Photo import allowed within the limits
   above. The first save/edit/delete warns "your changes are kept only for
   this visit — sign up to keep them" and creates a temporary private copy
   (deleted ~a day after last use). Signing up turns it into a real account.
4. ~~**Open sign-up for everyone.**~~ — DONE 2026-10-06: no invite code;
   hidden bot-trap field; 5 sign-ups per IP / 100 per day
   (`lib/signupLimits.ts`); new accounts get a copy of the showcase recipes
   (demo visitors who sign up keep their demo copy). Still later: a
   password-reset email (today only `scripts/set-password.ts`).
   Turnstile DONE 2026-10-06
   (`lib/turnstile.ts`, `components/Turnstile.tsx`) on sign-up and demo
   start; the first photo import needs none (only accounts/demos import, and
   both passed it). Live site key `0x4AAAAAAFPFuzUJRKzzW--3` (public); the
   secret goes only in the server's .env. Local .env uses Cloudflare's test
   keys (they answer with no action and hostname "example.com"). Still to do
   in this step: honeypot field, per-IP sign-up limit, open sign-up (drop the
   invite code), starter copies for new accounts.
   Was: **Open sign-up for everyone.** Bot protection that doesn't bother people:
   Cloudflare Turnstile in *invisible* mode on sign-up and the first photo
   import only, per-IP limits, a honeypot field. New accounts start with a
   copy of the 40 recipes (same copy step as 3). Later: password-reset email
   (today only `scripts/set-password.ts`).
5. **Flawless photo import.** One recipe per photo, but **one recipe may span
   several photos** (e.g. two pages). Score changes against a test set:
   Patricia's photo recipes plus new photos of different kinds she will add
   (incl. pages with a dish photo to crop). Also: automatic language
   detection, progress + "done" feedback (see below).
   - 2026-10-08 started: `extractRecipesFromPhotos` (lib/extractRecipe.ts)
     reads all photos taken together in one request: joins a recipe over
     pages, returns each recipe's text photos and a box around its dish
     picture (cropped by `cropPhoto`, lib/saveImage.ts), keeps tips under
     "Tipy:", drops intros/ads/credits and cut-off recipes. A photo that is
     mainly the dish picks the recipe(s) to keep — decided in code
     (`toPageRecipes`), models don't follow that rule. Structured output
     (JSON schema) — Gemini broke plain JSON on 3 of 5 cases.
     Test set: `scripts/test-photo-set.ts <folder|file>…` →
     `photo-import-review/` (costs printed; ~$0.003 per case on paid).
     5 cases checked 2026-10-08 (two-recipes-per-image, kure pomeranc,
     butter chicken, IMG_8147, banh mi): all right recipes + dish crops.
   - Paid fallback switched to `google/gemini-3.5-flash-lite` (.env
     OPENROUTER_MODEL_HQ; **also change it in Hermes' .env**): gemini-2.5-flash
     misread small print when given several photos (invented ingredients)
     and once looped to 65k tokens ($0.16) — every call is now capped at
     8,000 tokens. The free Gemma pool was rate-limited (429) on almost
     every try today; adding our own Google AI Studio key to OpenRouter
     (settings/integrations) might give the free models our own quota.
   - Not yet in the app: several photos per upload, the 1-of-N review, the
     dish crop as the card picture (scan kept as the source).
6. **Dish pictures, automatically.** Crop the dish photo from the page when
   there is one, otherwise generate one (once, stored, within the budget).
   The scan stays attached as the source photo.
   - 2026-10-08 started: `lib/dishImage.ts` — a free text model guesses the
     dish from title/ingredients/method and writes an English picture prompt
     (works well), then a free image model draws it. Providers: Cloudflare
     Workers AI (FLUX, free 10k neurons/day ≈ 170 pictures; needs
     `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_AI_TOKEN`), else Pollinations
     without a key (watermarked, weak "sana" model, often 402 — not good
     enough for the app). Try it without touching recipes:
     `scripts/generate-dish-images.ts` (3 recipes by default; more only once
     the 3 look good) → `dish-image-review/`. It uses the recipe's text, never
     the photo again.
     Not yet: a separate field for the dish picture (the scan stays in
     `imagePath`), generating on import, cropping a dish photo from the page.
7. ~~**Daily usage statistics.**~~ — DONE 2026-10-06: every AI call is
   recorded with model, tokens, cost, purpose and account/demo
   (`AiUsage` kind "call", via `lib/usageContext.ts`); recipe changes in
   `Activity`. Page `/admin/stats` (accounts marked with
   `scripts/set-admin.ts <email>`), report `scripts/usage-report.ts [days]`.
   Not yet: failed (busy) model attempts aren't counted; a daily email.
   Was: **Daily usage statistics.** A daily summary of AI use: tokens and cost per
   model (free and paid), how many imports and edits, from accounts vs.
   demo visitors. Today `AiUsage` records imports and paid-call costs only;
   this needs token counts for every model call (OpenRouter's `usage`) and
   edit events too. (Requested 2026-10-01.)
8. **Later.** Link import returns (incl. multi-recipe pages, already built);
   ChatGPT connection over our database (read-only MCP server with sign-in).

## Deferred features

- **Search.** Find recipes by title and ingredients. (Requested 2026-10-08.)

- **Recipes with photos of the instructions.** Recipes whose method is (also)
  shown in step-by-step photos — import and show them. (Requested 2026-10-08.)

- **Photo/voice: "reading finished" notification.**
  AI reading of a photo (and extraction in general) is slow on free models
  (~1–2 min). Add a notification when extraction finishes so the user doesn't
  have to watch the spinner — e.g. a browser notification (Notification API) or
  a clear in-page "done" state with a sound. (Requested 2026-07-20.)

- **AI-generated recipe image.** → roadmap step 6 (crop the dish photo from
  the page, otherwise generate).

- **Duplicate recipe check.**
  Detect when a recipe being added (from photo, URL, voice, or by hand) already
  exists in the database — e.g. same or very similar title — and warn before
  saving, or offer to open the existing one. (Requested 2026-09-23.)

- **Test the duplicate warning by hand** (added 2026-09-24): on Add recipe,
  paste an existing recipe's ingredients + steps under a new title and save;
  expect the amber "looks very similar" box with Save anyway; same title +
  same content should demand a rename. Then delete the test recipe from Trash.

- ~~**Multi-recipe import review ("1 of N" walk-through).**~~ — DONE
  2026-09-30 for link import (`components/UrlImport.tsx`); photo import
  stays one recipe per photo by decision (see roadmap step 5).

- **Social sign-in (Google / Facebook).** Deferred; email + password only for
  now. Would need OAuth callback routes and developer-console setup.

- **Section headings + crossed-out words pass (2026-09-30)** ran on the live
  database with `scripts/add-sections.ts`: 31 recipes gained component
  headings ("Cesto:", "Plnka:" …); two genuinely crossed-out words removed
  (Knedličková, šošovicová). Two false removals reverted by hand (Kapustnica
  "(cesnak)", Ázijská chili line — circled/arrowed, not struck). The models
  cannot see faint strike-throughs (Roláda "zohreje" fixed by hand). Not
  processed: pages that block server fetches (Allrecipes, Taste of Home,
  foodiecrush) and two that rate-limited (pradobroty.cz, YouTube mousse).

- **Review the 2026-09-23 bulk import.** 86 recipes came in from photos and
  Chrome bookmarks. Known gaps: chocolate-mousse video has ingredients but no
  steps; "Ovocné kože" article has steps but no ingredients; red-lentil soup
  and živánska photos have little/no method on the page. Bookmarks that could
  not be imported: soufflebombay brownie cookies (403), daybyme apple cake
  (404), Taste of Home AMP link, and five index/article pages.

## Phase 5 (going live) — still to do

- ~~Deploy to the Hermes server~~ — DONE 2026-09-29: https://recepty.brezinovi.sk
  - Hermes (Hetzner VPS, Ubuntu 24.04, reachable as `ssh root@hermes` over
    Tailscale; needs a browser "check" approval every ~12h).
  - App: `/srv/recipes/app` (git checkout, runs as user `recipes`), data in
    `/srv/recipes/data` (`recipes.db`, `uploads/`), env in `/srv/recipes/app/.env`.
  - Service: `systemctl status recipes` (Next.js on 127.0.0.1:3100).
  - Public: Cloudflare Tunnel "recipes" (`systemctl status cloudflared`,
    config `/etc/cloudflared/config.yml`); no inbound ports used.
  - Update: push to GitHub, then `ssh root@hermes /srv/recipes/deploy.sh`.
  - Backups: `recipes-backup.timer` nightly 02:30 → gdrive:RecipeAppBackup
    (this Mac's dev copy backs up to gdrive:RecipeAppBackup-mac instead).
  - Still to do: Cloudflare Access in front of the login page, OpenRouter
    monthly spend limit (both dashboard settings), firewall (ufw) once
    SSH-over-Tailscale is confirmed as the only SSH path, own rclone client ID.
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

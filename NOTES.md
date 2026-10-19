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
   - 2026-10-08 in the app: up to 5 photos per upload (camera one by one or
     several from the gallery), one model request, then the 1-of-N review
     (`components/MultiReview.tsx`, shared with link import). The dish crop
     is the card picture (`imagePath`); the photos it was read from are kept
     in `Recipe.scanPaths` (JSON list; migration copied the old photo
     recipes' photo there) and shown under the recipe and in the review form.
     Each crop is checked by a vision model ("does it show the dish?",
     ~$0.0004) — gemini-3.5-flash-lite put the box on text twice. A photo
     recipe saved without a picture gets a generated one after the save
     (`generateRecipePicture`, ~50 s; Cloudflare keys needed, else nothing).
     Tested end to end in the browser (butter chicken, two-recipe page).
   - 2026-10-11: whole test set imported (51 recipes); unused full-page dish
     photos are matched to their recipe; sideways crops are turned upright.
   - Deployed 2026-10-11 (scan_paths migration applied; Hermes' .env has
     `OPENROUTER_MODEL_HQ="google/gemini-3.5-flash-lite"` and the Cloudflare keys).
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
     Pollinations is off unless `DISH_IMAGE_POLLINATIONS=on`. Cropping and
     generating on import: see step 5. 2026-10-11: all existing photo
     recipes have a drawn picture; the scans are behind the photo button.
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
8. **Later.** Link import returns (incl. multi-recipe pages, already built).
9. **ChatGPT plugin** — BUILT and deployed 2026-10-19, not yet tried in ChatGPT.
   People ask ChatGPT "something quick / for many / keeps for days / with
   onion and tofu" and it picks (and may slightly adapt) one of *their*
   recipes, on their own ChatGPT plan. Pieces:
   - `/mcp` (app/mcp/route.ts, lib/mcp.ts): a small stateless MCP server,
     JSON only; tools in lib/mcpTools.ts — `list_recipes` (titles +
     ingredients, optional word query, accent-insensitive) and
     `get_recipes` (up to 5 in full, with links). Read-only.
   - Sign-in (lib/oauth.ts): OAuth 2.1 as MCP asks — discovery at
     `/.well-known/oauth-protected-resource` and `…/oauth-authorization-server`,
     dynamic client registration `/oauth/register`, approval page
     `/oauth/authorize` (signs in first), `/oauth/token` with PKCE S256 and
     refresh rotation. Hashes only in the DB; expired rows pruned hourly.
   - Recipe facts (time, servings, keeps): option B — ChatGPT reads the texts
     itself. If answers are poor, switch to A: AI fills the facts once (~$0.05).
   - Try it: ChatGPT (since Oct 2026 these are called "plugins") → Plugins
     → + → Add custom MCP server, URL `https://recepty.brezinovi.sk/mcp`,
     OAuth → Create as a plugin, then install it and @-mention it in a chat.
     Each tester adds it themselves. Works on the free ChatGPT plan too
     (Patrícia tested it on Free, 2026-10-19).
   - For the app directory still: support email (Patrícia will give it),
     terms page, OPENAI_APPS_CHALLENGE in .env (domain check, route ready),
     a review account without 2FA, test prompts, OpenAI account with global
     data residency.
   - Before submitting (decided 2026-10-19): **English version** of the
     sign-in, approval and privacy pages (reviewers; friends abroad) — later.
     Review = automated checks on upload, then people run our test prompts
     word for word on desktop, Android and iOS. So: test account with email
     + password (not Google-only) and recipes that fit the prompts; check the
     plugin is called reliably on phones too (it sometimes chose web search).
     Rejection notes are generic; median ~8 days, sometimes 30–90.

10. **Sign in with Google / Facebook** — BUILT 2026-10-19, waiting for keys.
   lib/socialLogin.ts + app/api/auth/social/[provider] (+ /callback); buttons
   (components/SocialButtons.tsx) appear only when the keys are in .env:
   GOOGLE_CLIENT_ID/_SECRET, FACEBOOK_APP_ID/_SECRET. Redirect URIs to
   register: `https://recepty.brezinovi.sk/api/auth/social/<google|facebook>/callback`
   (and `http://localhost:3000/...` for local tests). Finds the account by
   the stored link (SocialLogin table), then — Google only, verified e-mail —
   by e-mail; otherwise creates one (lib/accounts.ts, same limits and starter
   recipes as sign-up; a demo guest keeps their changes). Facebook never
   opens an existing account by e-mail (it doesn't say the e-mail is
   confirmed). Accounts made this way have no password (none can be set yet).

11. **Privacy policy** — full version 2026-10-19 (app/privacy/page.tsx), for
   Facebook, Google and GDPR. Name and contact from .env: PRIVACY_OPERATOR,
   PRIVACY_EMAIL (not in the public repo). Keep it true: IPs erased after 7
   days (lib/housekeeping.ts), DB backups 90 days, photo backups are never
   deleted automatically — on an account deletion request, delete that
   account's photos from gdrive:RecipeBackup/uploads by hand. No self-service
   account deletion yet (by e-mail request).

## Deferred features

- **Search.** Find recipes by title and ingredients. (Requested 2026-10-08.) Being done as the ChatGPT app (step 9), so the searching runs on the user's ChatGPT account and its tokens, not ours. Our server only exposes the recipes as tools (list, read, search by words).

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
  - Update: push to GitHub, then `scripts/deploy.sh` (runs the server's
    `/srv/recipes/deploy.sh`, then merges this Mac's recipes and photos into the
    live site — new and locally newer ones; see lib/sync.ts; `--dry-run` shows
    the plan). Needs `SYNC_USER=<email>` in .env.
  - Backups: `recipes-backup.timer` nightly 02:30 → gdrive:RecipeAppBackup
    (this Mac's dev copy backs up to gdrive:RecipeAppBackup-mac instead).
  - Still to do: Cloudflare Access in front of the login page (dashboard
    setting; the OpenRouter monthly spend limit is set, 2026-10-11), firewall (ufw) once
    SSH-over-Tailscale is confirmed as the only SSH path.
- **Database backups** — on the Hermes server only: `recipes-backup.timer`
  runs `scripts/backup.sh` nightly at 02:30 (SQLite snapshot, photos, JSON/
  Markdown export → gdrive:RecipeAppBackup). Log: `/srv/recipes/app/backups/backup.log`.
  The Mac's own backup was switched off 2026-10-11 (every deploy copies the
  recipes, photos and statistics to the server anyway); turn it back on with
  `scripts/install-backup-schedule.sh` (it uses BACKUP_REMOTE from .env).
  Backups had silently stopped 2026-09-29 → 2026-10-11 (script exited before
  logging under the schedulers; fixed). The stats page warns when the last
  backup failed or none succeeded for 2 days (`lib/backupStatus.ts`, needs
  BACKUP_STATUS_DIR in the server's .env).
  Own Google client ID — DONE 2026-10-11: Google Cloud project "Recipe backup"
  (consent screen External, published; Desktop app client "rclone hermes",
  scope drive.file). Its ID/secret are in this Mac's .env (RCLONE_CLIENT_*)
  for re-approving: `rclone config create gdrive drive client_id=… client_secret=…
  scope=drive.file --config <tmp>` on the Mac, then copy that file to
  Hermes' /root/.config/rclone/rclone.conf. With drive.file the new client
  sees only its own files, so backups now go to **gdrive:RecipeBackup**
  (BACKUP_REMOTE on the server); the old RecipeAppBackup folder is an archive.
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

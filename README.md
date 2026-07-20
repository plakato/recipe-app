# Family Recipes

A private recipe app: list recipes and add them four ways — by hand, from a URL,
from a photo, or by voice (the last three via AI extraction through OpenRouter).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind CSS v4**
- **SQLite** database via **Prisma 6** (`prisma/dev.db`)
- AI extraction via **OpenRouter** (added in Phase 2)

## Requirements

- **Node.js 20.9+** (this machine uses [nvm](https://github.com/nvm-sh/nvm) — run
  `nvm use 20` first, since the system Node is too old).

## Running locally

```bash
nvm use 20            # ensure Node 20+
npm install           # first time only
npx prisma migrate dev # first time / after schema changes — creates prisma/dev.db
npm run dev           # http://localhost:3000
```

## Environment variables (`.env`)

```
DATABASE_URL="file:./dev.db"                              # already set
OPENROUTER_API_KEY="sk-or-v1-..."                         # your OpenRouter key
OPENROUTER_MODEL="google/gemma-4-31b-it:free"             # free, vision-capable
OPENROUTER_MODEL_FALLBACK="nvidia/nemotron-nano-12b-v2-vl:free"  # used if primary is busy
```

**Free models only** (project rule). They are rate-limited (a few requests/min),
so the extractor retries on 429 and falls back to the second model.

`.env*` is gitignored. So is `prisma/dev.db` (the recipes) and `public/uploads`
(photos) — **these are backed up separately, never committed.**

## Status

- ✅ **Phase 0** — project + database
- ✅ **Phase 1** — manual add, recipe list + detail, edit, soft-delete to Trash + restore
- ✅ **Phase 2** — OpenRouter extraction (`lib/extractRecipe.ts`) + URL import
  (`/recipes/import/url`), including downloading the recipe's image. Note: some
  big sites (AllRecipes, etc.) block server-side fetches with a 403 — photo
  import covers those.
- ✅ **Phase 3** — photo import (`/recipes/import/photo`): take/upload a photo,
  a vision model reads it, the photo is saved as the recipe's image.
- ✅ **Phase 4** — voice import (`/recipes/import/voice`): record with the
  browser's Web Speech API (free, Chrome/Safari), edit the transcript, extract.
  Doubles as a paste-text importer. All four add-methods are now done.
- ⬜ **Later** — AI-generated image to replace the placeholder; deploy + backups
  + single-password site gate (Phase 5)
- ⬜ **Phase 5** — deploy, backups, single-password site gate

## Notes

- Login is deferred: there is one seeded owner (`lib/user.ts`) and every recipe is
  attached to it. The schema is already multi-user (`userId`), so adding logins later
  needs no data migration.
- Deleting a recipe is a **soft delete** (`deletedAt`) — it goes to Trash and can be
  restored. "Delete forever" in Trash is the only hard delete.

#!/bin/bash
# Nightly backup of the recipe app's data to Google Drive (via rclone).
#
# What it backs up, into gdrive:RecipeAppBackup/
#   db/dev-YYYY-MM-DD.db   consistent SQLite snapshot (one per day, 90 kept)
#   db/dev-latest.db       always the newest snapshot
#   uploads/               recipe photos (copy-only: nothing is ever deleted)
#   export/                recipes.json + markdown/*.md (human-readable)
#
# Run by hand:  scripts/backup.sh
# Scheduled by: ~/Library/LaunchAgents/com.recipe-app.backup.plist (nightly)
# Needs: sqlite3, rclone remote "gdrive" (rclone config), Node via nvm.
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="gdrive:RecipeAppBackup"
LOCAL="$PROJECT/backups"
LOG="$LOCAL/backup.log"
DATE="$(date +%Y-%m-%d)"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

mkdir -p "$LOCAL/db" "$LOCAL/export"
exec >>"$LOG" 2>&1
echo "=== $(date '+%F %T') backup start"

cd "$PROJECT"

# 1. Consistent copy of the live SQLite database (safe while the app runs).
sqlite3 prisma/dev.db ".backup '$LOCAL/db/dev-$DATE.db'"
cp "$LOCAL/db/dev-$DATE.db" "$LOCAL/db/dev-latest.db"
# Keep 90 days of local snapshots.
find "$LOCAL/db" -name 'dev-20*.db' -mtime +90 -delete

# 2. Human-readable export (JSON + Markdown). Node comes from nvm.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null
npx tsx --env-file=.env scripts/export-recipes.ts "$LOCAL/export"

# 3. Ship to Google Drive.
rclone copy "$LOCAL/db" "$REMOTE/db" --max-age 100d
rclone delete "$REMOTE/db" --include 'dev-20*.db' --min-age 90d || true
rclone copy public/uploads "$REMOTE/uploads"          # never deletes remotely
rclone sync "$LOCAL/export" "$REMOTE/export"          # mirror of the export

echo "=== $(date '+%F %T') backup done: $(rclone size "$REMOTE" | tr '\n' ' ')"

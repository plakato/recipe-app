#!/bin/bash
# Deploy from this Mac: update the live app to the pushed main, then merge
# this machine's recipes into the live site (lib/sync.ts: new ones added,
# ones changed here more recently overwrite; nothing on the live site is
# deleted, and edits made there since are kept).
#
# Run: scripts/deploy.sh [--dry-run]   (--dry-run: copy the photos, show the plan, change nothing else)
# Needs: everything committed and pushed; SYNC_USER=<your email> in .env;
#        ssh root@hermes working (Tailscale).
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT"
HOST="root@hermes"
LIVE_APP="/srv/recipes/app"
LIVE_UPLOADS="/srv/recipes/data/uploads"
DRY=""; [ "${1:-}" = "--dry-run" ] && DRY="--dry-run"

envval() { grep -E "^$1=" .env | cut -d= -f2- | tr -d '"' || true; }
USER_EMAIL="$(envval SYNC_USER)"
LOCAL_UPLOADS="$(envval UPLOAD_DIR)"; LOCAL_UPLOADS="${LOCAL_UPLOADS:-public/uploads}"
[ -n "$USER_EMAIL" ] || { echo "Set SYNC_USER=<email> in .env"; exit 1; }

if [ -z "$DRY" ]; then
  git fetch -q origin main
  [ -z "$(git status --porcelain)" ] || { echo "Uncommitted changes: commit first."; exit 1; }
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "main is not pushed: push first."; exit 1; }
  echo "== deploy code"
  ssh "$HOST" /srv/recipes/deploy.sh
fi

echo "== pack recipes"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
npx tsx --env-file=.env scripts/sync-export.ts --user "$USER_EMAIL" "$TMP/sync"
REMOTE_TMP="/tmp/recipe-sync-$$"

# Also on --dry-run (it only adds files that aren't there), so the plan is real.
echo "== copy photos"
rsync -a --ignore-existing --files-from="$TMP/sync.files" "$LOCAL_UPLOADS/" "$HOST:$LIVE_UPLOADS/"

echo "== merge recipes"
ssh "$HOST" "mkdir -p $REMOTE_TMP"
scp -q "$TMP/sync.json" "$TMP/sync.files" "$HOST:$REMOTE_TMP/"
ssh "$HOST" "cd $LIVE_UPLOADS && xargs -r chown recipes:recipes < $REMOTE_TMP/sync.files 2>/dev/null; \
  chown -R recipes $REMOTE_TMP && \
  sudo -u recipes bash -c 'cd $LIVE_APP && npx tsx --env-file=.env scripts/sync-apply.ts $REMOTE_TMP/sync.json $DRY'; \
  rm -rf $REMOTE_TMP"

#!/bin/bash
# One-time: encrypt the nightly backups (scripts/backup.sh) before they reach
# Google Drive. Creates the rclone "crypt" remote gdrive-crypt: over the new
# Drive folder gdrive:RecipeBackupEncrypted — file contents and names are
# encrypted on this server; Google stores only unreadable data — and points
# BACKUP_REMOTE in .env at it. The password is typed here (never shown or
# passed around); keep it in a password manager too: without it the backups
# can't be read.
#
# Run on the server, interactively:  bash /srv/recipes/app/scripts/setup-backup-encryption.sh
set -euo pipefail

ENV_FILE="/srv/recipes/app/.env"
CRYPT="gdrive-crypt"
FOLDER="gdrive:RecipeBackupEncrypted"
NEW_REMOTE="$CRYPT:backup"

if rclone listremotes | grep -qx "$CRYPT:"; then
  echo "rclone remote $CRYPT: already exists — nothing to do."; exit 1
fi

read -rsp "Backup password (from your password manager): " pw1; echo
read -rsp "Same password again: " pw2; echo
[ "$pw1" = "$pw2" ] || { echo "The passwords differ — nothing changed."; exit 1; }
[ "${#pw1}" -ge 16 ] || { echo "Use at least 16 characters — nothing changed."; exit 1; }

obscured="$(printf '%s' "$pw1" | rclone obscure -)"
unset pw1 pw2
rclone config create "$CRYPT" crypt remote="$FOLDER" filename_encryption=standard \
  directory_name_encryption=true password="$obscured" --no-obscure >/dev/null
unset obscured

# A quick check: a file written through the crypt remote is unreadable in
# the plain folder and readable again through the crypt remote.
probe="$(mktemp)"; echo "encryption check $(date -u +%FT%TZ)" > "$probe"
rclone copyto "$probe" "$NEW_REMOTE/check.txt"
echo "Through the encryption:  $(rclone cat "$NEW_REMOTE/check.txt")"
echo "What Google stores:      $(rclone lsf -R "$FOLDER" | head -3 | tr '\n' ' ')"
rclone deletefile "$NEW_REMOTE/check.txt"; rm -f "$probe"

cp "$ENV_FILE" "$ENV_FILE.bak-$(date +%F-%H%M)"
sed -i "s|^BACKUP_REMOTE=.*|BACKUP_REMOTE=\"$NEW_REMOTE\"|" "$ENV_FILE"
grep -q '^BACKUP_REMOTE=' "$ENV_FILE" || echo "BACKUP_REMOTE=\"$NEW_REMOTE\"" >> "$ENV_FILE"
echo "Done: backups now go to $NEW_REMOTE (encrypted, in $FOLDER)."

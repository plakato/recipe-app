#!/bin/bash
# Install (or reinstall) the nightly backup schedule on this Mac.
# Fills the project path into the launchd template and loads it.
# Run once: scripts/install-backup-schedule.sh
set -euo pipefail
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.recipe-app.backup"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"

mkdir -p "$PROJECT/backups" "$HOME/Library/LaunchAgents"
sed "s|__PROJECT_DIR__|$PROJECT|g" "$PROJECT/scripts/$LABEL.plist.template" > "$TARGET"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$TARGET"
echo "Installed $TARGET (nightly 02:30). Check: launchctl list | grep $LABEL"

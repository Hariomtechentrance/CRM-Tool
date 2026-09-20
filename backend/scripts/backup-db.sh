#!/bin/bash
# Independent backup of the BusinessOS production database (Neon), outside
# of Neon entirely. Neon's own "History window" (point-in-time recovery)
# only protects you from accidental changes *inside* Neon (bad migration,
# bad script, accidental delete) — it does NOT protect you from an
# account-level problem (billing dispute, account lock, service outage).
# This script is that separate safety net.
#
# Usage: ./backup-db.sh          (run manually any time)
# Also wired to a daily cron job — see the setup notes at the bottom.

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Deliberately NOT backend/.env — that's your local-dev database
# (crmtool, on your machine), not Neon production. This script reads a
# separate, dedicated file so a normal `npm run dev` session can never be
# accidentally pointed at production, and so this credential lives nowhere
# near the one your local app actually uses day to day.
# Create it once (not committed — already covered by .gitignore's
# ".env.production" rule):
#   echo 'DATABASE_URL="<paste the Neon production connection string here>"' \
#     > backend/.env.production
# Get the connection string from the Neon console: Overview page ->
# "Connect" button (top left) -> copy the connection string for the
# `production` branch. (This is the same value Render has set as
# DATABASE_URL for the live backend — Neon's UI is just the easiest place
# to copy it from.)
ENV_FILE="$SCRIPT_DIR/../.env.production"
BACKUP_DIR="$HOME/BusinessOS-Backups/neon-prod"
RETENTION_DAYS=30
# Prefer the version-matched pg_dump (Neon runs Postgres 18) if installed;
# fall back to whatever's on PATH otherwise.
PG_DUMP_BIN="/usr/local/opt/postgresql@18/bin/pg_dump"
if [ ! -x "$PG_DUMP_BIN" ]; then
  PG_DUMP_BIN="$(command -v pg_dump)"
fi

mkdir -p "$BACKUP_DIR"
LOG_FILE="$BACKUP_DIR/backup.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# ── Load DATABASE_URL from backend/.env.production ────────────
if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: $ENV_FILE not found."
  log "Create it with your Neon PRODUCTION connection string (see the comment block at the top of this script for exactly where to copy it from) — do not reuse backend/.env, that's your local database."
  exit 1
fi
DATABASE_URL="$(grep -m1 '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'"'\r')"
if [ -z "$DATABASE_URL" ]; then
  log "ERROR: DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

# ── Dump ──────────────────────────────────────────────────────
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
OUT_FILE="$BACKUP_DIR/businessos-prod-$TIMESTAMP.dump"

log "Starting backup -> $OUT_FILE (using $PG_DUMP_BIN)"
if "$PG_DUMP_BIN" "$DATABASE_URL" -Fc -f "$OUT_FILE"; then
  SIZE="$(du -h "$OUT_FILE" | cut -f1)"
  log "OK: backup complete ($SIZE)"
else
  log "ERROR: pg_dump failed — see output above"
  rm -f "$OUT_FILE"
  exit 1
fi

# ── Rotate old backups ────────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "businessos-prod-*.dump" -mtime +"$RETENTION_DAYS" -print -delete | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
  log "Rotated: deleted $DELETED backup(s) older than $RETENTION_DAYS days"
fi

log "Done."

# ── Restore, if you ever need it ─────────────────────────────
#   pg_restore --clean --if-exists --no-owner --no-privileges \
#     -d "<a fresh/target DATABASE_URL>" "<path-to-.dump-file>"
#
# ── Cron setup (run once, from a terminal) ────────────────────
#   crontab -e
#   Add this line to run daily at 3:00 AM (adjust the path if you moved
#   the project):
#   0 3 * * * /Users/admin/Desktop/Techentrance\ Project/BOS/CRM-Tool/backend/scripts/backup-db.sh >> /Users/admin/BusinessOS-Backups/neon-prod/cron.log 2>&1

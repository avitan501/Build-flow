#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PROJECT_REF="nprfhspwdflpqlopydmp"
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${AVANTIA_BACKUP_ROOT:?AVANTIA_BACKUP_ROOT must be an absolute, dedicated backup directory}"

case "$SUPABASE_DB_URL" in
  *"$EXPECTED_PROJECT_REF"*) ;;
  *) echo "Refusing backup: database URL is not production project $EXPECTED_PROJECT_REF." >&2; exit 1 ;;
esac
case "$SUPABASE_URL" in
  "https://$EXPECTED_PROJECT_REF.supabase.co") ;;
  *) echo "Refusing backup: API URL is not production project $EXPECTED_PROJECT_REF." >&2; exit 1 ;;
esac
case "$AVANTIA_BACKUP_ROOT" in
  /*) ;;
  *) echo "Refusing backup: AVANTIA_BACKUP_ROOT must be absolute." >&2; exit 1 ;;
esac
case "$AVANTIA_BACKUP_ROOT" in
  /|/root|/root/buildflow-supply|/root/buildflow-security-20260907)
    echo "Refusing backup: choose a dedicated backup directory." >&2
    exit 1
    ;;
esac

umask 077
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="$AVANTIA_BACKUP_ROOT/$EXPECTED_PROJECT_REF/$STAMP"
mkdir -p "$SNAPSHOT/storage"

pg_dump --format=custom --no-owner --no-privileges --file="$SNAPSHOT/database.dump.partial" "$SUPABASE_DB_URL"
mv "$SNAPSHOT/database.dump.partial" "$SNAPSHOT/database.dump"
node scripts/backup-supabase-storage.mjs "$SNAPSHOT/storage"

sha256sum "$SNAPSHOT/database.dump" "$SNAPSHOT/storage/manifest.json" > "$SNAPSHOT/SHA256SUMS"
printf '%s\n' "$EXPECTED_PROJECT_REF" > "$SNAPSHOT/PROJECT_REF"
printf 'Backup completed: %s\n' "$SNAPSHOT"

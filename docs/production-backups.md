# Avantia production backups

Production is Supabase project `nprfhspwdflpqlopydmp`. Never run these commands against a URL that does not contain that ref.

## Daily database recovery

Keep the production project on Supabase Pro so Supabase retains seven daily database backups. These database backups do not contain the actual Storage objects, so the files need the separate backup below.

## Database and Storage copy to Hetzner

On the Hetzner server, keep the database URL and service-role key in a root-readable environment file outside the repository. Set `AVANTIA_BACKUP_ROOT` to a dedicated encrypted backup volume, then run:

```bash
bash scripts/backup-production-supabase.sh
```

Schedule it once per night only after one manual run succeeds. The script refuses a mismatched Supabase project, refuses broad destination paths, writes private files, leaves incomplete database dumps marked `.partial`, and creates checksums plus a Storage manifest.

Do not automatically delete old snapshots until a restore test has succeeded. Keep at least 30 daily snapshots when disk capacity allows.

## Restore drill

Do not restore directly over production as a test. Restore the newest `database.dump` into a temporary isolated Postgres/Supabase environment, verify row counts for customers, requests, estimates, proposals, documents, communications, catalog, and pricing history, then verify a sample of files against `storage/manifest.json`. Record the date and result of the drill.

A real production restore causes downtime and may overwrite newer data. It requires David's explicit approval of the restore point immediately before the operation.

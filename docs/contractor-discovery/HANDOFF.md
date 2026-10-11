# Contractor discovery questionnaire — implementation handoff

English 30-minute owner-led conversation with 15 core questions in six timed sections, four optional service follow-ups, per-contractor answers, and an editable help plan. Department names/items use the saved service planner. The planner toolbar links to `/owner/service-planner/interviews`.

## Scope and decisions
- Start with a recent real order; capture evidence, frequency and impact before suggesting help.
- Prioritize at most two pains; match to takeoff, quotes, orders and reorders without forcing a match.
- Record approvals, site-receiving responsibility, exclusions, next action, success measure and an agreed fee.
- Save separate interviews with optimistic revision checks and bounded history; preserve unsaved text on failures/conflicts. JSON backup and printable plan available. Internal notes excluded from the plan preview.
- Owner-only page/API; no customer messages, purchases or autonomous AI actions.

## Storage and release
New additive migration: `supabase/migrations/20261011031813_add_owner_contractor_interviews.sql`. Existing planner storage is unchanged. Migration has NOT been applied to production; code has NOT been pushed or deployed.

Worktree: `/root/avantia-contractor-discovery-20261011`; branch: `codex/contractor-discovery-20261011`. Baseline live/canonical SHA independently verified: `cff78ce881354e5f377bfc08c4c0aca95c6799b8`. Codex sole implementer; no active publisher. Production Supabase ref verified during preparation: `nprfhspwdflpqlopydmp`; independently reverify before any mutation.

## Verification
- Seven API/store tests passed (four new, three existing planner); final new tests rerun passed.
- Eight new browser scenarios passed across desktop Chromium and mobile WebKit; twelve existing planner scenarios also passed.
- Full final webpack production build and TypeScript passed; changed-file ESLint and diff checks passed.
- Local PGlite PostgreSQL-compatible rehearsal: RLS enabled, anon/authenticated access denied, service-role select/insert/update allowed, delete denied, stale revision rejected, invalid type rejected, existing planner record unchanged. Not a production migration or production integration test.
- Desktop interview and mobile plan screenshots visually inspected; four synthetic-data screenshots in this directory. Tests verify internal-note exclusion, persistence/reload, separate records, conflict/error handling and literal rendering of untrusted text.

## Next step
Review questionnaire and approve publication. Then follow shared AGENTS production-release rules, apply the additive migration to the independently verified target, publish only the tested candidate through the approved hook, and verify exact live SHA and authenticated behavior. No production writes or external messages occurred in this task.

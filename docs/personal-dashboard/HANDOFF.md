# Personal tasks dashboard

Outcome: an owner-only personal board at `/admin/goals-progress/website-work/personal`, reached by the **משימות פרטיות** button on David Dashboard. Reuses the approved moving-circle workspace, background, responsive layout, pause/reduced motion, add/edit/complete/reopen and recoverable delete. Hebrew task text uses automatic direction. The business board and lead roster keep their existing workflows.

## Data and privacy

- Separate `personal_dashboard_tasks` table; no personal records in team/business task queries and no sharing control in this board.
- Owner identity plus existing board PIN required by page and each action. Updates match session owner, task ID and the last-seen timestamp. Stale edits fail without overwriting newer work.
- RLS combines authenticated user ownership and the existing approved-admin predicate. Anonymous privileges revoked. Only content/status columns can be updated by authenticated clients; deletion archives records.
- Migration `20261018141023_personal_dashboard_tasks` applied to independently verified production project `nprfhspwdflpqlopydmp`. File version matches migration history.
- Exactly three user-requested tasks inserted once with unique owner/seed keys, for the owner confirmed against the current authenticated browser. Readback: three distinct open records; another authenticated identity sees zero. No private task was executed, and no calls/messages sent.
- Security advisor reports no finding for the new table.

## Verification

- Disposable PostgreSQL 17 database (bootstrap in `tests/fixtures/personal-dashboard-db-bootstrap.sql`, assertions in `supabase/tests/personal_dashboard_tasks.sql`): migration, owner CRUD, timestamp updates, archive/restore, unauthorized read/update/insert, ownership forgery, anonymous access and hard-delete rejection passed. No test records written to production.
- Eleven focused action/access/lead tests, six motion tests and ten release-guard tests passed. Business dashboard UI regression checks passed.
- Personal CRUD/navigation/privacy passed in Chrome and mobile Safari. Final six shared/personal motion, touch and keyboard checks passed across both engines, including 320/390/1440 layouts. Desktop/phone screenshots inspected. Full webpack production build including TypeScript and 155 generated pages passed; changed-file ESLint and diff checks passed. Exact release evidence recorded in the root handoff after release.
- A pre-existing shared dependency directory lacked a Next.js webpack module. Installed the exact committed lockfile in this worktree with `npm ci`; no dependency or lockfile changes.
- Local motion tests use real pointer/touch coordinates for moving circles. Safari exposed a real resume bug: native dialog close restores `:focus-visible` after touch. The shared motion hook now tracks pointer/keyboard input so touch resumes while keyboard focus still pauses; listeners are removed on unmount.

## Ownership and release

Codex sole implementer/publisher. Worktree `/root/avantia-personal-dashboard-20261018`, branch `codex/personal-dashboard-20261018`, baseline `60874b7b0e77438f493509fc042c167da5db122a`. Unrelated dirty root work preserved. Existing approved production hook only; exact release and screenshots to be recorded in `/root/buildflow-supply/docs/personal-dashboard-20261018/`.

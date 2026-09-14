# PAY01 — Carlos $5/hour payment requests

## Scope / source of truth

- Branch `codex/carlos-payroll-20260914`, worktree `/tmp/avantia-carlos-payroll-20260914`, base `8c79820c767fbf49f0e239678bd4fa82886df983` independently verified live at start, production Supabase `nprfhspwdflpqlopydmp`.
- Production schema inspected read-only: attendance and old `paidAt` are JSON in `manager_goals.details`; no payroll/attendance tables. Existing manager-goals RLS permits all approved admin/staff to edit fields, so UI-only authorization was inadequate.
- Owner is normalized `avitanneto@gmail.com` with approved active admin profile; Carlos is normalized `buildavantiap@gmail.com` with approved active staff profile. Database checks current `auth.users` identity, not editable user metadata. Other admins cannot change pay.
- No production writes, migration, deployment, real payment, email, SMS or AI provider call. Root owns release/master context.

## Implementation

- Compact Pay panel on existing `/admin/daily-summary`, not a new navigation area. Completed days show worked hours, unpaid/requested/paid status and aggregate unpaid total. Carlos selects available unpaid days and requests payment. David alone sees mark-paid/mark-unpaid controls.
- Actual worked milliseconds = checkout minus check-in minus accumulated pauses. $5/hour; aggregate rounds once to cents. Incomplete/invalid/actively paused days cannot be requested. No flat $5 fee, no whole-minute rounding for payroll.
- Additive private ledger, immutable request records and owner payment-state audit events. Original daily summaries retained; legacy paid markers respected without backfill or inference. Requests snapshot milliseconds and cannot themselves mark paid.
- Database RPCs serialize conflicting payroll/attendance actions with an advisory lock; request UUID replay is idempotent, overlapping requests cannot charge twice, owner updates use optimistic version checks. Direct staff/owner table DML cannot forge attendance or paid fields. Privileged helper payment changes still require the actual owner identity. Summary notes/photos remain editable while retaining protected time/payment data.
- Clock transitions use database timestamps and guarded state transitions; repeated clock-in/out/pause/resume in the same state is harmless. Existing today-only Eastern Time attendance policy and completed-note requirement remain. This does not add overnight time-log repair or arbitrary historical time correction.
- No outbound notification or fund transfer: a payment request appears in the owner’s existing Pay panel. Mark paid records David’s confirmation; it does not execute a payment.

## Files

- Migration `supabase/migrations/20260914185259_carlos_payroll_authority.sql`
- `app/admin/daily-summary/{actions.ts,page.tsx,payroll-actions.ts}`
- `components/buildflow/carlos-payroll.tsx`, `lib/carlos-payroll.ts`
- `tests/carlos-payroll.spec.ts`, updated `tests/admin-daily-summary.spec.ts`, local SQL/concurrency fixtures under `tests/fixtures/carlos-payroll-*`

## Verification

- 23 focused tests passed: payroll arithmetic/security contracts, existing daily summary/attendance/date/DST/dashboard regressions and real React component interactions at390/1440 for Carlos and owner. Browser tests use compiled production CSS and synthetic actions; they do not claim authenticated live mutation/persistence.
- Screens `/tmp/payroll-carlos-390.png`, `/tmp/payroll-owner-390.png`, matching1440 screenshots visually reviewed at phone size; no horizontal overflow. Synthetic refresh does not replace fixture data; real page refresh reads RPC state.
- Actual PostgreSQL17 isolated fixtures: $5 for1h net after30m break in1.5h span; same UUID replay; overlap rejection; request unpaid; Carlos paid/unpaid denial; other-admin denial; normalized owner acceptance; stale version denial; direct JSON time/payment forgery rejection; notes preservation; duplicate clock-in; audit/persistence and mark-unpaid reset.
- Two concurrent overlapping payment requests: exactly one accepted, other rejected. No duplicate payable request.
- Full lint:0errors/31 pre-existing unrelated warnings. Final targeted lint clean. Production webpack build passed153pages; existing preferredRegion deprecation only. Standalone TypeScript passed after test harness correction.
- Initial browser harness tried unavailable esbuild, then a TS bundler regex was overescaped; corrected without adding dependencies. Initial SQL test incorrectly indexed an in-progress day that is deliberately excluded; corrected fixture assertion and reran fresh database successfully. Initial prebuild tsc lacked generated RouteContext; build generated it. These were test/setup issues, not hidden passing claims.
- Final DB trigger avoids advisory/row lock order inversion on ordinary note updates; only direct INSERT needs date-creation advisory serialization. Final migration and SQL assertions reran successfully on a fresh fourth local database after that refinement.

## Release gate / remaining checks

Root must review migration/permissions, integrate current approved website work, then coordinate additive migration with website deployment. New clock actions require the RPC; old paid action direct-DML writes are intentionally rejected after migration, so do not leave versions mismatched. No Edge change is required. After approved release, verify owner/Carlos visibility and a safe authorized test record’s persistence; actual payment changes need exact user approval.

Malformed/duplicate historical daily summaries are not automatically repaired; ambiguous days are rejected on mutation. Existing overnight/unclosed historical shifts remain excluded until an explicitly reviewed correction workflow. PostgreSQL superuser access can inherently alter any database; website/API actors are the enforced authority boundary.

Frozen AI candidate4be39d00 is unrelated and MUST NOT be released with this work. Its blocking audit is `/tmp/AI_FROZEN_ADVERSARIAL_AUDIT_20260914.md` (reviewed rows deletion, source-occurrence collapse, NULL-generation finalization).

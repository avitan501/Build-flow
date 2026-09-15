# PAY next-release integration — Maya

## Root release gate — 2026-09-15 UTC

Integrated the entire PAY implementation on core `b671a247` in isolated
`/tmp/avantia-payroll-production-release-20260915` (`f3ac2120`, `8712c969`).
Full combined webpack production build (153 routes), standalone TypeScript,
32 Chromium/WebKit tests using this build's CSS, and scoped ESLint passed.
Root independently reran fixture + exact migration + assertions in a separate
network-isolated PostgreSQL database; passed and removed only that test database.
No production attendance/payment mutation or payroll migration yet.
Migration SHA256: `7ed2c3a48e98228c92c84763ec6769af1ab32a568e4031bb99ffd041aad13b05`.
Core publication and authenticated verification must finish before this rollout.
Immediately before the payroll cutover, reconfirm the production ref and active
shift state. Preserve legacy paid markers and the historical unclosed day.

The Vercel deploy hook reads `avitan501/Build-flow`, not merely the canonical
`AV-Design-and-Build-Org/avantia-build` repository. All approved mirrors must have
the exact candidate SHA before triggering the serialized workflow. Do not treat
a canonical push or successful build as live publication.

Branch `codex/payroll-next-release-20260914`, isolated `/tmp/avantia-payroll-next-release-20260914`.

Base `ca908e3d` contains the coordinated request UI/route safety changes. Complete frozen PAY commit `508c8213` integrated cleanly as `20a84133`. No partial cherry-pick, no modification of the root worktree and no deployment.

## Fresh checks on this integrated branch

- 32 focused tests passed across Chromium/WebKit (`tests/carlos-payroll.spec.ts`, `tests/admin-daily-summary.spec.ts`), including actual React owner/Carlos controls at390/1440. Fixture styling comes from the frozen original PAY production build; the current combined branch has not yet been built.
- Fresh isolated database `payroll_next_20260914` in existing network-isolated Docker container `avantia-maya-payroll-qa-20260914`: fixture schema, full migration and all SQL assertions passed.
- Two simultaneous overlapping pay requests: exactly one accepted; the other rejected with `day_already_requested`. Test executable was used in-memory with only local container/database/socket names substituted; repository test unchanged.
- Scoped ESLint passed. Full build is deliberately pending until root's core release build finishes, to avoid competing memory usage.

## Remaining release gates

1. Rebase/integrate any newer core commits before final PAY release; preserve the currently approved request/Edge work.
2. Root permits a full combined build; run it and standalone TypeScript plus relevant broader tests.
3. Reconfirm productionrefnpr and active shift state immediately before coordinated RPC/trigger/application cutover. This migration intentionally blocks old direct timestamp writes; it cannot be deployed alone as a harmless UI-only update.
4. Explicitly authorized owner/Carlos live verification; current existing Chrome9222 is Carlos staff, not owner. Do not switch login or perform a real clock/payment action without the scoped instruction.

Earlier live read-only aggregate inventory remains evidence, not a repair:18 daily rows,0duplicates/malformed,1historical unclosed,8legacy paid. No time or payment inference/backfill. No provider calls, production SQL, payroll/attendance changes, login changes or deployment during this integration.

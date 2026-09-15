# Carlos daily wins removal — 2026-09-15

Requested scope: remove the daily-wins targets/percentage card, preserving Carlos's dashboard, tasks, attendance and payroll. Confirm the existing Clock In page; do not redesign it yet.

- Base: verified production `214464e0c7a4b0b10059a6e2168824345a146fe4`.
- Isolated worktree: `/tmp/avantia-remove-carlos-daily-wins-20260915`, branch `codex/remove-carlos-daily-wins-20260915`.
- Changed `app/admin/goals-progress/page.tsx`: removed scorecard import/render and six scorecard-only database reads. Shared workspace also removes the card from `/admin/build-map`. Underlying activity records, libraries and payroll are untouched.
- Updated `tests/carlos-daily-goals.spec.ts` to require removal and retain activity-recording assertions.
- Lint and 26 focused tests passed (Chromium and WebKit, including owner/Carlos payroll fixture controls). First payroll-fixture run preceded build CSS and failed for missing CSS; rerun after CSS generation passed all 26.
- Existing authenticated browser, read-only direct CDP: `/admin/daily-summary` renders `Time Log & Daily Summary` with Pause/Check out controls. No buttons clicked, non-GET requests blocked; no hours, payments, records or messages changed. Browser-level Playwright attach timed out; direct connection to our own new page worked, page closed afterward.
- Production release and post-release verification recorded in master context after completion. No Supabase migration or setting change required.

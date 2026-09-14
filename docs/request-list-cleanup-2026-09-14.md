# Customer Requests list cleanup — 2026-09-14

## Scope and baseline

Isolated worktree `/tmp/avantia-request-list-cleanup-20260914`, branch `codex/request-list-cleanup-20260914`, based on independently verified live `58c5c6548e8e34c292447fdfd59ed2aa86575f87` on `https://avantiabuild.com` (production; Supabase `nprfhspwdflpqlopydmp`). Root owns integration, deployment, and master-context updates. Communications work remains separate.

## Changes

- Customer Requests (`/admin/users?view=requests`) cards no longer show Delete request, the redundant submitted badge, Direct material request fallback, or Manual material list fallback. Meaningful project names, addresses, category answers, other statuses, archived restore controls, search/sort/status filters, and request-code navigation are preserved.
- Opened request header has a collapsed Request actions disclosure containing status/project/address and the existing Delete request control for the same allowed open statuses.
- Existing confirmation, server authorization, UUID/RPC checks, and production permanent-deletion protection are unchanged. Successful detail-page deletion returns to the request list; other uses of the shared deletion component retain their existing behavior.
- No stored status, source, request, supplier, or customer data was changed.

## Verification

- Two new regression source-contract tests pass.
- Seven release-guard tests pass.
- Changed-file ESLint and `git diff --check` pass; added diff reviewed for secrets and unintended changes.
- Existing authenticated Carlos cookies copied only in memory to an isolated local browser context. Existing user/employee tabs untouched.
- At 390 and 1440 pixels: list clutter absent; first request link opens its correct detail; Request actions starts closed; opening exposes Delete request; confirmation includes irreversible warning; Cancel leaves the detail open. No horizontal overflow in detail.
- All browser POST requests were blocked during verification (25 background POST attempts blocked). No actual deletion was attempted or business mutation performed. Success redirect is source-tested, not executed against real records.
- Screenshots: `/tmp/request-list-390.png`, `/tmp/request-list-1440.png`, `/tmp/request-actions-390.png`, `/tmp/request-actions-1440.png`. Desktop list and phone actions visually inspected.
- Full production webpack build passed, including TypeScript and generation of 153 pages. Existing preferredRegion deprecation warning only.

## Release and limitations

Not pushed or deployed by this task. Parent must integrate on latest approved production, complete serialized release checks, and verify live role-specific behavior.

Production deletion may intentionally be disabled unless `ALLOW_PERMANENT_DATA_DELETION=true` in a supervised window. This task does not enable that flag or claim real deletion works in production. Mobile checks used Chromium viewport emulation, not physical Safari. The separate legacy manager inbox route was not redesigned. The next requested per-step assignee/note/status controls are explicitly outside this candidate.

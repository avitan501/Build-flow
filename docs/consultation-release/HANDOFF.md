# Consultation release preparation — 2026-10-13

## Requested outcome

David explicitly requested production deployment, bookings owned by `office@avantiabuild.com` instead of his personal email, and varied unavailable times. Codex is the sole designated publisher. No deployment, push, new account, or schedule change has been performed in this release follow-up.

## Required decision before release

The Google sign-in page was checked with the exact address `office@avantiabuild.com`; it reports “Couldn’t find this account.” Existing signed-in Google accounts are `buildavantiap@gmail.com` and `avitanneto@gmail.com`. The current public schedule belongs to the latter and must not be released as if it belongs to the office address.

An asynchronous user question is pending: authorize setup of Google Calendar/Meet for the existing office address, or use the existing Avantia Google account. Google supports creating an account with an existing non-Gmail email, but this needs separate account-setup authorization under AGENTS.md and may require email verification and user-provided identity details. Do not create an account, change credentials, purchase Workspace, or silently use another address without the user's decision.

Google reference: https://support.google.com/accounts/answer/27441?hl=en

## Calendar plan

Keep 15-minute appointments, New York timezone, Google Meet, and real-calendar conflict checks. Offer genuinely limited start times that vary by weekday; do not create fake busy events or claim unbooked times are taken. Suggested implementation after the account choice:

- Monday: 12, 2, 3, 4 PM.
- Tuesday: 12, 1, 2, 4 PM.
- Wednesday: 12, 1, 2, 3 PM.
- Thursday: 12, 2, 4 PM.
- Friday: 12, 2 PM.
- Weekends: unavailable.

These varying windows have not yet been applied. Replace the public booking URL in `lib/consultation.ts` and the WhatsApp draft after verifying the business account's schedule. Reconcile the old personal schedule separately without deleting existing appointments or sending cancellations.

## Code and verification

- Worktree: `/root/avantia-consultation-release-20261013`.
- Branch: `codex/consultation-release-20261013`, based on `62e79fbaa5d2310e77a4e93e06e604e05408bbb3`.
- Earlier website, booking page, chat, and animated footer changes are already included.
- Changed hours wording to display the consultation window and actual available choices, rather than promise every hourly slot.
- Updated existing contact-bar tests to use the approved single right-side chat icon; previous functionality assertions retained.
- Production webpack build of the integrated baseline passed. Final business-calendar URL still requires a final build before publishing.
- TypeScript, changed-file ESLint and diff checks passed.
- Ten deployment-guard tests passed (hook calls mocked).
- Twenty desktop/phone homepage/contact scenarios passed: nineteen first run, one cold-route navigation timeout passed on targeted retry.
- Twenty-three bounded application release regression tests passed against the local production build on port3004. SMS submissions were mocked; no messages sent.

## Verified release routing

- Live `/api/release`, canonical main and hook-bound mirror main all match `df745dbc96d8fefcbd123fa301a36f5ce0d805d1`.
- Domain `avantiabuild.com`, Vercel project `prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE`, team `team_ppEl8INgejzz6LoMr6UhXnfs`, production Supabase `nprfhspwdflpqlopydmp` confirmed.
- Existing hook `Avantia primary production`, ID `U8IJX9nbyf`, `main`, `avitan501/Build-flow` confirmed via the authenticated Vercel dashboard. Its URL was stored only in a mode0600 temporary file for this task; never print or commit it.
- No active Vercel deployment or canonical GitHub Actions run at preflight. Recheck immediately before release.
- CLI Vercel token is expired; use the existing authenticated noVNC Vercel browser. GitHub credential helper works. Do not change credentials or create another hook.
- Push only the final tested commit, with fast-forward checks to both canonical and mirror main, trigger the existing approved hook once, then verify exact live SHA and behavior. Never use direct production CLI.
- Current code/preview checkouts and root dirty changes remain preserved.

Next: receive the booking-account decision, finish the real business schedule, verify its anonymous booking form and owner identity, update URLs, complete final build/checks, and publish within the deployment authorization already given.

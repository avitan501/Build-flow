# Private service and fee planner — 2026-09-23

## Scope

David requested the latest conversation table on **avantiabuild.com**. New owner-only route: `/owner/service-planner`, linked under Manager Tools. Preserves all 17 departments, 119 existing tristate service choices, pain/solution choice lists, earlier wording, and seven blank internal fee fields. Approved names: Plumbing, Electrical & HVAC; Material Cost Review. WhatsApp CTA uses the existing site business number, (516) 990-1990. No homepage replacement.

## Saving and privacy

- Existing `requireOwnerAccess` / `getOwnerAccessSession` protects HTML and API.
- New `owner_service_planners` table: RLS enabled, all PUBLIC/anon/authenticated privileges revoked, server service role has select/insert/update only. No browser database credentials.
- Revision-checked insert/update protects competing saves. Sequential browser saves, explicit error/conflict state, unsaved-navigation warning and JSON backup.
- Last 20 previous versions retained; restoring produces a new saved version. Blank fee fields remain undecided; placeholders are examples, not customer prices.
- Customer preview and Letter-landscape printing omit fee controls and previous draft wording; only selected services/pains/solutions appear. Default draft is one Letter page; extensive additional wording may span more pages.
- State is read from the database on page requests; unavailable storage returns 503, never silently resets to seed. Seed is used only when no planner row exists. No database seed mutation required for first load.

## Verification

- Full production webpack build and TypeScript passed; final rerun after print/history fixes recorded in `/tmp/avantia-planner-final-build.log`.
- Full lint: zero errors, 32 existing warnings; changed files lint clean.
- 6 browser tests passed across Chromium and mobile WebKit: selections, server-mock persistence/reload, history restoration, print privacy, failure/conflict behavior, mobile overflow.
- 3 API/store tests passed: owner/origin gates, validation/body limits, revision conflict, history, HTML escaping and private caching.
- 10 release guard tests and 23 existing application regression tests passed.
- PGlite local PostgreSQL rehearsal: migration valid, anonymous/authenticated direct access denied, service-only write/read and stale-revision update rejection passed. No production database changes yet.
- Real local app anonymous requests: planner redirects to login (307); API denies (403).
- Desktop/phone screenshots inspected: `desktop.png`, `phone.png`. `customer-preview.pdf` verified one page.
- Browser tests mock server responses; actual authenticated production save/reload remains a required post-deployment check, within the new planner only.

## Release state

Worktree `/root/avantia-service-planner-20260923`, branch `codex/service-planner-20260923`, based on verified production and both canonical/mirror main SHA `51ee5caedb29395b8feff836d0c9effc11457290`. Codex sole publisher. Other active local tasks do not overlap this page. Shared dirty checkout untouched except required continuity notes.

Authenticated Vercel read confirms `build-flow-wfl3`, project `prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE`, team `team_ppEl8INgejzz6LoMr6UhXnfs`, avantiabuild.com domain, latest deployment READY at baseline; production Supabase environment names configured. Canonical `/api/release` proves production ref `nprfhspwdflpqlopydmp`.

**Publishing held:** authenticated GitHub GET reports `.github/workflows/vercel-owner-release.yml` is `disabled_manually`. Earlier Sept 17 exception was scoped to another task and is not reused. Existing Vercel hook named `Avantia primary production`, bound to main, is available but has NOT been triggered. No alternate route, GitHub setting, billing change or new credentials authorized. No push, migration, deploy or external message performed.

Next: obtain David's explicit approval for this candidate's existing Vercel hook (or restoration of the approved workflow). Then recheck live/main/no overlapping publication, apply only the new additive migration to confirmed `nprfhspwdflpqlopydmp`, verify grants, push exact candidate to canonical and hook-bound mirror, trigger once, verify READY and exact `/api/release`, then authenticated private page/authorized save-reload and anonymous denial. Do not alter existing business data. No customer or supplier messaging.

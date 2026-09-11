# Homepage loading incident and comparison readability

David prioritizes a fast, light, usable request flow over further AI extraction tuning and authorized website publication. Active domain is only https://avantiabuild.com.

## Evidence and scope

- Before fix, anonymous homepage request timed out after 20 seconds with zero response bytes. `/api/release` still returned production `0906a5ce2918b82da03d7908041295fca03ca3e2`, Supabase `nprfhspwdflpqlopydmp`.
- Vercel production logs showed `GET /` failing with `Failed to load current profile` at 11:45:13 and 11:45:21 UTC. Login and manager notification logs also showed `AuthRetryableFetchError` status 504.
- Root layout awaited authentication/profile and then public catalog before HTML. Proxy also awaited claims for the public homepage. This is a confirmed blocking dependency, not proof of the underlying Supabase outage cause or an exact Safari-device reproduction.
- `c333c300` (agent source `dfdd179f`): exact `/` bypasses proxy auth only; optional session chrome and public catalog now have separate Suspense boundaries, outside page children. Catalog request cancels after 3 seconds. Profile failure uses public header; protected guards unchanged. No DB/Edge mutations.
- `32fc5c60` (agent source `fea2bca7`): comparison cards emphasize cheapest eligible offer per product plus manual selection; remaining offers collapsed and still accessible. Matching/exclusion/math unchanged. Choices are explicitly temporary, not saved or a final mixed-supplier award.

## Verification before publication

- Full Next production build and TypeScript passed, 153 pages generated. Targeted ESLint and diff check passed.
- 19 homepage/comparison tests and 7 deployment guards passed. Broader request suite initially 51/52: one stale static assertion expected a fixed-width status control, while existing live code already uses responsive full width. Updated assertion without changing UI; all 3 tests in that file then passed. Total distinct focused application cases covered: 71.
- Added-line secret-pattern scan: 331 reviewed lines, zero matches (pattern scan is not a guarantee of all possible secrets).
- Existing noVNC Chrome only. Playwright CDP initialization stalled on existing targets, so used direct page CDP in a new tab in the same browser/context. No separate browser launched.
- Local production-build homepage HTML contained the hero at 76 ms; browser 390 px first contentful paint 600 ms, no overflow or JS errors. JavaScript-disabled 390 px page still shows hero/actions, FCP 148 ms. These are local measurements, not user-device performance promises.
- Local comparison at390: no overflow/errors; opening other offers and selecting a non-cheapest supplier retained focus and moved selection into primary visible offers. Screens: `/tmp/avantia-home-candidate-390.png`, `/tmp/avantia-home-nojs-390.png`, `/tmp/avantia-comparison-candidate-card-390.png`.
- Production project independently confirmed: `prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE`, team `team_ppEl8INgejzz6LoMr6UhXnfs`, latest prior deployment READY and canonical domain present. Preflight homepage timed out; release endpoint verified exact current identity. Isolated worktree `/tmp/avantia-request-clarity-20260911` preserves all approved0906 changes.

## Remaining

## Follow-up verification and intake continuity

- `2750f9e3` adds a light hero base when photography fails; verified image-blocked320 and slow-network390 remain readable, no overflow/errors. Homepage and comparison1440 checked visually. First release run34596241237 is still in progress at this entry; do not infer publication from push.
- `22cc361e` extends exact anonymous route handling to `/request-quote` and `/beat-a-quote`, GET and POST. Their existing public action does not consume proxy claims. All protected/auth checks remain; nested/unlisted paths still follow existing handling. Independent read-only action audit completed before change.
- Follow-up full build/typecheck passed;72/72 distinct focused application cases passed together. Public forms displayed at390/1440, one form each/no horizontal overflow/no JS errors. Local production first HTML chunks request-quote56ms and beat-a-quote30ms. No actual submission, upload, customer creation, email or push performed.
- Important service evidence: read-only pg_stat_activity aggregate via production management API failed after15s with connection timeout, even while project status reports ACTIVE_HEALTHY. Do not claim the underlying incident resolved.
- Submission remains dependent on Auth/admin user creation, DB inserts, storage, email and organization enqueue. Some external calls are unbounded; each invocation creates a new reference, so naive timeout/retry can duplicate accepted requests. Durable idempotency is required before automatic resubmission. Existing anonymous matching-contact profile updates merit a separate security review; not introduced by this release.

## Remaining work (current)

- Publish verified candidate, then verify live first response/phone/desktop and actual request access. Not yet published at this entry.
- Supabase authentication/profile delays remain a separate service incident; homepage resilience does not fix login or protected request data availability.
- Request638410 organizer job38 remains failed (`organizer_http_503`, attempts5); Vault key presence confirmed without reading out values. Two safe invalid-ID authenticated endpoint probes timed out; unauthenticated probe returned401. No extraction retry or source/HOLD quantity edits made. AI work deprioritized by David.
- Payroll deferred: $5/hour; only `avitanneto@gmail.com` may mark paid/unpaid. Carlos may only clock in/out and ask to be paid. No payroll changes or payment actions.
- Autosave completion, partial quote reimport preservation, stale alternative approvals, permanent Meet, and genuine SMS failures remain open as documented in request clarity handoff. No messages sent and no defect tickets closed.

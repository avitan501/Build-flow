# Client-completed questionnaire

## Outcome
Separate public self-completion version of contractor discovery, per David's choice of one public link anyone can submit. Existing owner-led questionnaire, question bank, records and planner are unchanged.

- Public route: `/questionnaire` (not published yet).
- Owner inbox: `/owner/service-planner/client-responses` (owner authentication required).
- 15 direct questions in six sections, four core answers required plus contact details and consent. Same blue/white visual concept; optional questions clearly marked. No account needed.
- Browser-tab drafts survive refresh; answers sent only on Submit. Review/edit, JSON download, clear draft, explicit error preservation, confirmation and optional consultation link.
- Owner inbox lists submissions separately, opens all answers, supports JSON download/print and offers the public URL to copy. It links to the original owner-led interview page; original page is not edited.

## Implementation
Worktree `/root/avantia-client-questionnaire-20261019`, branch `codex/client-questionnaire-20261019`, baseline `a609cb8b` (live/main verified before changes). Codex sole implementer; no parallel agents.

New routes under `app/questionnaire`, `app/api/client-questionnaire`, `app/owner/service-planner/client-responses`, `app/api/owner/service-planner/client-responses`; new library `lib/client-questionnaire`. Standalone route-rendered HTML follows the existing interview page architecture, with nonce CSP and no third-party scripts. Editable sources form.html/inbox.html/styles.css produce imported JSON through `node scripts/build-client-questionnaire.mjs`.

Additive migration `20261019171237_add_client_questionnaire_submissions.sql` was generated with Supabase CLI. New immutable client submissions table only. No migration applied to production.

## Storage and access
- RLS enabled; anon/authenticated table and RPC access revoked. Only service-role SELECT/INSERT, with owner checks on inbox endpoints. No public GET endpoint for submissions, no public edits, no direct browser database access.
- Strict server schema, four required answers and contact/consent validation, 100KB streamed request cap, same-origin check, honeypot.
- Transactional RPC serializes duplicate IDs and per-network quota; identical retries return confirmation, conflicting retries cannot overwrite, five new submissions per daily network bucket. No raw IP stored. Bucket is a daily HMAC using the existing server secret and Vercel's client-IP header. Local fixtures use a synthetic secret and local bucket.
- All text displayed with textContent; no HTML rendering of client data. Downloads use JSON blobs.
- No email/SMS delivery or promises of automated notifications. Responses are read in the owner inbox.

## Verification
- Seven new API/schema/page/store/asset tests passed; five existing interview API/store tests passed; ten release guard tests passed.
- Real disposable PostgreSQL17: access denial for anon/authenticated table and RPC, service-role update/delete denial, RLS enabled, identical retry, changed retry rejection, concurrent network limit and eight simultaneous retries proved one record. No production data used.
- Four browser scenarios each passed in Chromium and mobile WebKit: complete client→real local DB→owner inbox flow, owner/staff/anonymous restrictions, review/draft persistence, failure/retry, duplicate protection, text escaping and 1153/390/320 layouts. Keyboard focus and no overflow checks passed.
- Initial browser run found a real local Host/request.url mismatch; same-origin helper now permits the actual same-protocol Host. Invalid-field navigation now persists the corrected step. One Safari test initially raced the existing login redirect; test navigates away before switching identity. Final suites passed.
- Desktop and phone screenshots visually inspected; `client-1153.png`, `client-390.png`.
- Changed-file lint and diff checks passed. Full production build status recorded in final checkpoint below.

## Local reproduction
Start unexposed disposable `postgres:17-alpine` container named `avantia-client-questionnaire-20261019` with POSTGRES_HOST_AUTH_METHOD=trust (no host port). Apply `tests/fixtures/client-questionnaire-bootstrap.sql`, then the new migration through `docker exec -i … psql -U postgres -v ON_ERROR_STOP=1`.
Run `node tests/fixtures/client-questionnaire-server.mjs` (loopback3119). Run Next on3110 with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3119 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon SUPABASE_SERVICE_ROLE_KEY=local-questionnaire-only`.
Run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110 npx playwright test tests/client-questionnaire.spec.ts --workers=1`. The fixtures contain synthetic-only identities and a test key, never real credentials. Run `CLIENT_QUESTIONNAIRE_DB_TEST=1 node --test tests/client-questionnaire-db.test.mjs` separately from UI tests, as both reset the disposable table. DB tests are opt-in; default runs skip them.

## Production status / next step
No push, deployment, production migration, production record changes, messages or customer submissions. Review screenshots, then explicitly authorize publication of the separate form and new submission storage. Before release, reverify live ref/project/domain and both mains, preserve latest approved changes, apply additive migration to independently confirmed `nprfhspwdflpqlopydmp`, then use the existing approved production hook once. Live canonical URL must be `https://avantiabuild.com`; verify exact release and read-only page/access behavior. Do not create production test submissions without authorization.

Reference docs checked: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel request headers](https://vercel.com/docs/headers/request-headers), bundled Next16.3.4 Route Handler documentation.

## Final checkpoint
Full Next webpack production build and TypeScript passed. New dynamic public/inbox/API routes included; all155 static pages generated. All checks above complete. Screenshots inspected; original questionnaire paths have zero diff against baseline. Disposable fixture server/container stopped after verification; no local preview kept running. Ready for review and explicit production publication approval.

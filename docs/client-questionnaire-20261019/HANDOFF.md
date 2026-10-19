Latest continuation: see [copy cleanup](COPY-CLEANUP.md) for preview-only wording changes after the [completed production release](RELEASE.md). Historical implementation notes below predate that release.

# Client-completed questionnaire

## Published — current authoritative state

Live application `f9c523b19e8bb33bf15d674923e94e91da8cc592` is deployed and verified after David’s explicit approval. [Release evidence and live links](RELEASE.md). Public questionnaire and private response inbox are live; original questionnaire unchanged. Both additive migrations applied to the verified production database, approved hook once, exact live SHA verified. All release checks passed; labeled synthetic test response verified and removed. Earlier preview-only notes below are historical. Codex publisher complete/free.

Latest approved copy: all seven active material/general quote-comparison answers now say “Compare quotes for the same materials, quantities, and delivery.” Historical question choices retained; the existing draft migration preserves old wording as Other. Chromium/mobile WebKit verified served choices, selection, recap and no overflow; no submission. Integration expectation updated to the new text. David explicitly deferred Foundations / concrete; do not add it yet. Preview only.

Latest approved addition: Interior finishes now opens with optional multiple product choices: Flooring / tile, Cabinets / counters, Doors / trim, Paint, Appliances, plus the existing Other text option. Choices use the existing Done/edit summary and are retained in the submitted material details. Removed the redundant scope hint. Desktop Chromium and mobile WebKit checks passed for selection, Done, reload, editing, composed answers and no overflow; no submission. Preview only.

Latest approved addition: windows/doors services includes “Arrange a meeting with a supplier to help me choose.” Verified in the served preview and isolated browser selection/composed-priorities check. No submission or publication. Interior-finish subcategories were subsequently approved and added below.

Latest approved addition: drywall/insulation services now includes “Make sure my order includes everything my installer needs.” This brings the earlier questionnaire’s complete installation-supply check into the client form. Interior finishes already includes its own installation-supply choice. Preview only; no publication.

Latest preview adjustment: removed “Kitchen / bathroom renovation” from the project choices at David’s request. Other project choices and the original owner questionnaire are unchanged. Existing drafts keep an earlier selection as editable Other text. Verified served preview configuration and existing API checks; no publication.

## Current implementation — approved question and UI/UX improvements

David said “Do it” after the complete review. The improvements are now implemented in the existing isolated preview worktree. Plain checklist retained; multi-select stays open until Done, contradictory selections prevented, service questions deduplicated and recap based on actual material selections. Contact is near sending; optional location/timing follows the successful receipt. No HVAC. Original owner interview unchanged. Local-only additive follow-up storage, scoped signed save token, private inbox details. Full build/TypeScript, lint/diff,13 questionnaire API/PostgreSQL checks,5 original interview API checks,10 desktop/phone UI cases and6 integrated DB/inbox cases passed. Screenshots inspected; revised-flow/ contains evidence.

Authoritative current detail and verification: [IMPLEMENTATION.md](IMPLEMENTATION.md). Historical audit: [UX-AND-QUESTION-REVIEW.md](UX-AND-QUESTION-REVIEW.md). Codex sole implementer; no publisher. Preview3110/fixture3119 remain running. No production changes, pushes, merges or messages.

## Earlier preview history (superseded by the implementation above)

Latest step3: “Your delivery plan” asks “How would you like to receive your materials?” Choices: stages as project progresses / everything together as soon as possible / help plan deliveries / Other. Recap label now delivery preference. Existing next_step key retained, including old drafts. Preference only, not guaranteed availability/date. Generated assets rebuilt; diff checked. Preview only.


Latest copy refinement: main priorities question is “How can we make your next order easier?” with matching action answers: prepare my list, compare quotes, coordinate approved order, track delivery, follow up/reorder, help decide where to start. Other retained. Diff check passed; copy-only preview update.


## Encouraging, solution-focused experience — current preview

David requested motivating/positive participation and a sense of useful progress. Applied copywriting skill: headline “Let’s make your next material order easier”, priorities framing, positive selection checkmarks, restrained green states, Next step / See my starting plan / Send my priorities actions. Review now includes an actual selection-based recap (materials, requested help, timing) as a starting point for discussion, with no guaranteed savings or implied approved work. Existing compact answers, optional follow-ups and user-specified time-spent question retained. Roofing questions unchanged. Six browser tests plus two recap/CTA assertions on Chrome/WebKit passed; seven API checks, lint/diff passed. Preview only; no production changes, full build still needed before release. Same isolated branch/Codex owner.


## Remaining categories aligned — current preview

David authorized simplifying drywall/insulation, interior finishes and plumbing/electrical to source/readiness plus multi-select services. Roofing preserved as approved. Earlier answers retained. Main friction prompt now “What takes up most of your time when buying materials?”; choices now name time-consuming tasks (comparing, finding stock, calls, order/delivery follow-up, reorders, no major time spent). Six browser checks across Chrome/WebKit, seven API checks and diff passed. Preview only, same isolated branch/Codex owner; no production changes. Full build remains required before release.


## Windows two-question correction — current preview

Preserved source question (Plans / Window schedule / Other). Replaced overlapping installer-contact and first-help prompts with one multi-select services question: quotes from plans/schedule, compare quotes, confirm sizes/details with installer, approved order, delivery/missing-item follow-up, Other. Earlier contact/help responses retained under Earlier answer in composed response. Two all-material desktop/mobile checks and diff passed. Preview only, same isolated owner/branch; no production changes.


Latest Windows / doors copy: first question now “Where should we get the window details?” with Plans / Window schedule and built-in Other text. Replaces selection-readiness question per David. Preview only, diff passed; original questionnaire unchanged.


## Auto-compact answers — current preview

After selecting a follow-up answer, its options collapse into a compact question/answer summary with Change or Add / change. Multi-select remains editable; Other keeps typing visible until Done. Reload restores selected summaries. Four general desktop/mobile browser checks plus two dedicated collapse/edit/Other checks passed (initial dedicated test selector ambiguity corrected); seven API checks/lint/diff passed. No storage writes or production changes. Same isolated owner/branch, preview only; full build required before release.


Latest copy: lumber “Missing items” choice now “Follow up on orders / arrange reorders”, per David. Preview only; no behavior changes, diff check passed.


Current copy correction: lumber service question now “What would you like us to handle for your lumber order?” so multi-select service answers match the prompt. Choices and behavior unchanged; diff check passed. Preview only.


## Plain checklist — current preview

David explicitly approved trying both questions visible as plain inline choices. Removed question pager; all follow-ups visible under selected parent. Removed answer card backgrounds/borders, reduced gaps, retained native radio/checkbox inputs and clickable labels (32px touch rows). Other text and saved answers unchanged. Four desktop/mobile browser checks, seven API checks and diff passed. Preview only; no production changes, full build required before release. Codex sole owner, same isolated worktree.


## One-question-at-a-time panel — current preview

David still found collapsed rows too large and requested another style. Replaced stacked expanders with one visible follow-up per material, compact radio/checkbox answer chips, left/right question navigation and position counter. Optional Other text appears on selection. Hidden slide answers remain saved and included. Four desktop/mobile browser checks verify arrow navigation, independent category state, visibility, reload and mocked submission; seven API checks/lint/diff passed. Preview only, same isolated ownership; no production changes. Full build required before publishing.


## Collapsed answer-picker style — current preview

David requested another style taking less space. Follow-ups now use native details/summary rows, collapsed by default with question and selected answer/count visible. Single choices auto-close; multiple selections and Other remain open with a Done button. Questions, data and category placement unchanged. Desktop/mobile browser checks passed, including explicit opening via summary, selection persistence and mocked submission; seven API checks and diff passed. Preview only; full build required before release. Same owner/branch, no production activity.


## Two-question lumber panel — current preview

David dictated shorter answers. Lumber list: Yes / Contact my framer / Takeoff from blueprints / Other text. Second question combines direct framer coordination and order help with multi-select missing items, confirming orders, approved framer list, comparing supplier quotes, approved order/delivery and Other. Removed separate lumber help question (earlier answers retained). Generic follow-up renderer supports multi-select while other categories stay single-select. Four Chrome/WebKit checks include multiple picks + Other restoration/submission; seven API checks and diff passed. Same isolated branch/Codex owner; preview only, no publisher or production changes.


## Compact follow-ups — current preview

David requested much smaller expanded categories. Follow-up answers now wrap as compact chips with smaller text, gaps and padding; mobile touch targets retain44px height. All questions and draft/submission behavior preserved. Four desktop/mobile browser checks and diff passed. Generated CSS rebuilt; preview only, no publication. Codex sole owner, same isolated branch; full build remains required before release.


## Earlier-page service questions — current revision

David clarified the earlier planner is the source. Read framing pains/solutions in `/root/avantia-all-departments-20261013/dist/index.html` and trade question banks in `lib/contractor-discovery/questions.json`. Each material now asks readiness, whether Avantia should speak directly with the trade (yes / check with me first / no / unsure), and which concrete help to start with. Lumber covers approved framer list, comparable quotes, approved orders/delivery and shortages. Same tailored pattern across six categories; each panel stays directly under parent. Earlier responsibility responses are retained as Earlier answer when composing answers. Follow-up Other text capped200 characters. Seven API checks, four desktop/mobile checks, lint/diff passed. Preview only; no outreach, migration or publication. Full build still needed before release. Codex remains sole owner on same branch/worktree; no publisher active.


## Whole questionnaire refinement — 2026-10-19

David requested thoughtful questions throughout the client experience. All six material categories now have two tailored optional follow-ups about readiness (lists, quantities or selections) and responsibility (preparation, measurement, buying or tracking). Each opens immediately below its own choice. Five core questions retained; copy clarifies optional detail and asks about purchasing friction, first help wanted and next-order timing. Other free text remains available. Original owner interview unchanged. Three-minute completion is a target, not a measured promise.

Fixed panel/control IDs to be unique across all categories. Combined material answers now accept up to10000 characters, while other answers remain limited to2500, so selecting all categories with optional notes remains supported. No migration needed. Seven schema/API tests including limits, four Chrome/WebKit tests covering all categories, direct nesting, independent drafts, unchecked exclusion, review and mocked submission passed; lint and diff passed. No test responses written to preview storage. Preview3110 running; no production deployment or external communication. Full build required before release. Codex sole owner, existing isolated branch/worktree; no publisher active.

## Lumber follow-up questions — 2026-10-19

David corrected the intent: ask whether the client has a lumber list and who prepares it, directly under the Lumber / framing option. Replaced material-type choices with two optional single-choice questions plus Other text. Nested panel now sits immediately after its parent label inside its grid cell. Draft persistence and composed review/download/submission answers maintained; unchecking lumber excludes its follow-ups. Desktop Chrome and mobile Safari tests passed for nesting, visibility, restoration, custom text, submit payload and no overflow. Generated assets rebuilt; diff check passed. Preview3110 updated only; no production release. Full build remains required before publishing. Codex sole implementer on existing isolated branch/worktree; no active publisher.

## Current preview revision — three-minute tap-first form

David clarified: clients should finish in about3minutes with very little typing. Current version has five questions in three sections: project type, materials, main challenge, help wanted, timing. All offer tappable choices and optional Other text. Name and one contact method required; company optional. Three core questions required, all answerable by tapping. Review/submit remains separate. Earlier longer-form notes are retained and shown under Earlier notes, not discarded.

Current local live-editing preview runs on3110 with temporary fixture3119; no production release. Seven API/schema/store checks and lint/diff passed; five prior choice-flow scenarios passed on both Chrome/WebKit before shortening; final short-form Chrome/WebKit tests passed with intercepted submission (no preview database reset or writes). Screenshots `quick-chromium-desktop.png` and `quick-mobile-safari.png`. Last full production build preceded this preview refinement; rerun before publishing.

## Initial implementation outcome
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

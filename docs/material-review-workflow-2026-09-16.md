# Step 1/2 material review — production release and verification

## Step 1 tasks 1–4 — 2026-09-16 21:05 UTC

- Authorized scope: immediate recognized draft with Undo; inline new/editable source rows; relevant per-row/shared questions; identical displayed/saved/copied material lines. Supplier matching/comparison task5 remains separate.
- Isolated worktree `/tmp/avantia-material-review-20260916`, branch `codex/material-review-workflow-20260916`, based on latest canonical/hook/live `be9f370d`; primary dirty143 files preserved. No overlapping publisher observed.
- Added `lib/material-spreadsheet-draft.ts`, `spreadsheet-row-actions.ts`; updated spreadsheet, row-recognition action and atomic item-edit action. New row uses authenticated staff/session RLS and stable ID insert with exact duplicate verification, never upsert. Edited recognition text is separate from immutable received source. Existing full item/source CAS and receipts retained. Strict field/details bounds reject rather than silently truncate. Legacy saved dimensions bridge to separate inputs; no refilling intentionally cleared values. Copy blocked while rows unsaved; last acknowledged revision used during refresh lag. Browser close/reload warns on unsaved rows.
- Questions: filter unrelated address/delivery/section, generic named-TJI brand/grade/width and nonexistent box packaging questions; retain real missing dimensions/package questions. Shared 10-inch convention only asked when present, no unapproved defaults.
- **24/24 tests passed**, including actual add server action under a mocked database (not production persistence), real React browser fixture recognition/new row/Undo/save/copy/remount/failure/stale revision. TypeScript/lint passed. Full Next16.3.4 webpack build passed153 routes. Existing9222Chrome owned local fixture:62 rows, widths1440/390/320 no document overflow; narrow table scroll only. Owned tab closed.
- Edge `material-row-recognition` version3 ACTIVE, bundle `417465f341b7b733f28e6b0e51ed367d1a34cb2ae01b1aa5edd893cdb133f045`; custom exact configured-key auth unchanged; unauthenticated POST401. Target verified by canonical `/api/release` production/npr before mutation. No schema/credentials changes.
- Frontend publication and final authenticated live checks still pending at this checkpoint. Existing QA request `ebc5830c-fc75-46fb-9814-6c9a46e06f0a` explicitly named QA/no sends or orders, draft,4 existing items; use it for actual new-row Save/edit/reload proof, not customer Framing. No outbound messages or business approvals.

## Current status — 2026-09-16 20:25 UTC (supersedes historical notes below)

- Frontend **LIVE** at `083deaf6665e288d39b536d52c328a684045bcd1`, verified through canonical `/api/release`; production binding `nprfhspwdflpqlopydmp`. Official release workflow `35144813836` succeeded including regression, full build/type/lint and live binding guards. Vercel deployment `dpl_8d7fdUqojuLrK6kMGpR8m9GAXTbd`.
- Existing noVNC Chrome 9222 authenticated live test: target request shows **39 client rows**, all three supplier names (U.S. Lumber, Certified, Builders FirstSource), and no document overflow at 390px. Own test tab closed; other tabs untouched. No Apply/Save or business approvals submitted.
- First live recognition failed. Updated the Edge Function authentication to exact configured server-key validation supporting both modern secret keys and legacy service-role keys, with gateway JWT verification disabled only because custom authentication is enforced. Deployed **version2**, bundle SHA `741e3fc2fb628c4e95eca4791d68d5e7b792e9d44ad181c83288ab404b6ce9b8`. Unauthenticated live POST still **401**. Eight local positive/negative auth assertions passed. Same live row then successfully returned a proposal: quantity22, TJI230, length16ft, unresolved10-inch depth explicitly queried. No secret exposed/changed. This demonstrates restored integration, not proof that every possible PDF is accurate.
- 39 supplier-derived request rows were previously marked excluded additively, not deleted. Release adds retention regression to prevent comparison sync deleting their price history. One historical supplier association still needs source reconciliation; no automatic relinking performed.
- Evidence: `/tmp/avantia-step1-live-desktop.png`, `/tmp/avantia-step2-live-desktop.png`, `/tmp/avantia-step1-live-phone.png`, `/tmp/avantia-recognition-live.png`. Raw CDP test `/tmp/avantia-material-live-cdp.mjs` (only one proposal request per run).
- **Not certified complete:** three fresh PDF uploads, actual new-UI persistence/concurrent edit test, original new-row editing, dimension-conflict handling, historical standalone comparison filtering, complete inline Step2 price matrix. Existing `client-material-list-ai` stale-answer source guard has not been separately deployed. Do not present this bounded release as 100% of all requested work.

## Historical pre-release assessment (retained for traceability)

## Follow-up clean-line UX correction — 2026-09-16

Reported screenshot: legacy fields do not contain a separated TJI depth until a recognition proposal is applied; right column displayed old saved data above a large yellow proposal. Updated right column to display the actual recognized line immediately with a preview label and `Use recognized line`; questions are collapsed and the duplicate yellow panel removed. Existing explicit Apply/Save behavior and revision guards remain. A shared clean-line formatter now excludes structured address/shipping/price requirements from displayed and copied material lines, retains floor/specifications and preserves metadata. No production request data edited. TJI10 inches continues to be depth, never width. Seven focused clean-line/recognition tests passed; TypeScript/lint checked. Source auth-test typing corrected after full type check exposed a pre-existing union issue. Publication/live UI verification recorded in master context when complete.

## Scope and ownership

Worktree `/tmp/avantia-material-review-20260916`, branch `codex/material-review-workflow-20260916`, based on verified production `d1e29f20ad5a41157bf754a2c9bf2e06e095bfc1`. Canonical site `https://avantiabuild.com`; production ref `nprfhspwdflpqlopydmp`. No other active implementation/publisher observed. Primary dirty worktree preserved.

User explicitly authorized reuse of existing AI credentials. The earlier credential-choice gate is resolved; do not ask again. Local key failed HTTP401. Existing production Vault credential succeeded in one controlled OpenAI test (pg_net request186282, HTTP200, 4323tokens). No secret exposed, copied, rotated or newly created. Test assumptions were never saved as customer approvals.

## Implemented candidate

- Six conditional shared clarification questions, no preselected answers, scoped TJI/LVL conventions, existing atomic receipt/revision persistence action.
- Spreadsheet: received source, editable structured fields, clean line; row recognition returns a proposal, then explicit Apply and Save. Existing source stays unchanged. Fields locked during requests; stale revisions cannot save/apply. Recognition questions survive saving as review reasons.
- Source-grounded numeric checks correct demonstrated model errors: TJI depth not width; dimensional lumber width/depth; mixed-fraction LVL; no invented sheet size; unknown box contents flagged. Only explicitly saved scoped conventions can normalize 10-inch depth.
- Comparison specification retains compound dimensions when new width/depth fields are used. Reused supplier lines and specific quantity/material/mount/unit differences are visible and never approved automatically.
- New service-role-only Edge Function reads the existing Vault key. Server action enforces staff authorization and request/item/source revision checks. Function is NOT deployed or runtime-verified yet.

Files: new `lib/material-{list-clarifications,row-recognition}.ts`, new clarification/recognition server actions, new shared-question/spreadsheet components, worktable/page wiring, existing item-edit action, received-price matrix/helper, supplier routing specification, client-material-list-ai stale-answer guard, local preview/shell route, three new test files and existing price tests. No schema migration.

## Evidence

- Actual AI output:39/39 source IDs and quantities preserved. Initial semantic placement errors reproduced and fixed with deterministic regression checks. Saved real output replay under explicit TEST conventions now yields39rows, zero quantity differences,8rows with questions. This is not a claim of complete semantic accuracy.
- Sequential snapshot replay adds the3 actual supplier columns one after another without mutating fixtures. This is NOT3 fresh PDF uploads and is NOT persistence testing.
- Targeted suites:39passed,2private older78-row fixture tests skipped. New opt-in39-row replay ran against actual private fixtures.
- Browser:62-row synthetic fixture,6unselected questions, quantity editing, save enablement, desktop and736/390/320 viewports, no document overflow or JS errors. No Save/Recognize network mutation performed. Screenshots `/tmp/material-workflow-desktop.png`, `/tmp/material-workflow-phone.png`.
- TypeScript and targeted lint passed. Full webpack production build passed153routes before the final preview-width and compound-dimension helper changes; subsequent TypeScript passed. Full build must be repeated for final release candidate.

## Verified production data defect — NOT repaired

Request `ffbbe612-c9a2-447f-9901-0dde51333132` has39original client-derived products plus39products historically extracted from the Certified supplier PDF. Its attachment is now supplier-classified, but those39old products remain. No manually_reviewed_at markers found on those39. They have39comparison rows and no procurement route rows. One supplier price remains linked to a contaminated comparison row; do not blindly delete/suppress rows and lose it.

That link: supplier_quote_items `7d62aefb-5cb6-4412-8343-994b63afc814`, line36,40pieces2x12DougFir24ft; comparison item `28464d86-94fd-41d2-860d-983612143b1c`; request item `ee53818f-fdca-4b10-890f-985559984e7f`. Its derived section says Second floor, but original matching needs explicit source reconciliation, not name-only relinking. Comparison `c8984e52-2b0a-4a65-bf34-ed98109fc432` is review, client draft, no award/active route/sent timestamp.

## Required before publication

1. Safe provenance reconciliation across source39/derived78/comparison rows, retaining quote data, manual associations and audit evidence.
2. Finish new-row original editing/recognition and field-conflict handling; do not silently retain conflicting old combined dimensions alongside changed width/depth.
3. Verify actual atomic persistence and concurrent edits, including shared-question refresh behavior and recognition source traceability.
4. Validate/deploy Edge Function with complete dependency bundle; bounded authenticated runtime test and no repeated paid calls.
5. Three sequential uploads in isolated test context, correct persistent source-line allocation, reload, fourth/fifth supplier regression.
6. Final full build, coordinated single production release, exact release and authenticated live flow verification.

No business request/quote/approval/order data changed. Only external write was the controlled AI test via existing production network queue. No messages sent. No commit/deployment claimed.

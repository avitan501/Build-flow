# Step 1/2 material review candidate — not published

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

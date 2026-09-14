# Step 1 continuity / coordinated request UX — local candidate

Worktree `/tmp/avantia-step1-continuity-20260914`, branch `codex/step1-continuity-20260914`, baseline verified production `8c79820c`. No production database, customer records, external messages or deployment changed.

## Implemented

- Readable full product list (including unrepresented original products), essential specifications/quantity, one focused question on desktop/mobile. No stock photos or repeated Ready badges in the organized view.
- Actor + request scoped resume stores only product ID/question key. Invalid/deleted IDs are discarded. Request/actor change remounts the workspace.
- Next unresolved / Leave unresolved wrap without changing any product or clearing a warning. Blank choices stay blank; known specifications are not defaulted again.
- Organized quick answers and organized Edit details compare the version the employee actually saw, including original source snapshot. A newer product/source is shown for review rather than overwriting it.
- Private server-only before/after receipts and transactional source/item locks. Undo requires the same actor, exact current after-snapshot and unchanged source; coworker changes and new source block Undo. Qualification status is preserved/restored.
- Supplier routing moved into Step 2 for organized requests, using the existing group/default/product exception writer and revisions. Generated supplier lookup remains explicit, inside group tools; adding suppliers sends no messages. Product group and online-price tools remain available compactly.
- Existing original intake/tools/attachments, AI organize, source copy and Step 2 comparison actions remain available.

## Verification so far

- Final post-visual-fix webpack production build passed (153 static pages, TypeScript included).
- TypeScript passed after current action/type changes.
- Targeted lint: zero errors/warnings.
- Final built-server run: all 34 tests passed across Chromium and WebKit. Includes same product/question after reload, next unresolved without mutation, no horizontal overflow, 62-row narrow and wide layouts, late server-payload race regression and existing material-review guards.
- Local isolated Postgres transaction tests passed: save, stale write, correct Undo, coworker overwrite prevention, original-source changes, source-aware Undo rejection, private table/RPC privileges, approved-but-unauthorized staff rejection. All fixture data rolled back.
- Screens: `/tmp/step1-review-chromium-desktop-390.png`, `/tmp/step1-review-wide-chromium-desktop.png`, `/tmp/step1-review-mobile-safari-390.png`. Visual review caught and fixed narrow-container/wide-viewport squeezing; container sizing is explicit and checked.
- Local browser fixture `/preview/request-items` is inaccessible unless server-only `AVANTIA_LOCAL_UI_TEST=1`; default production returns not-found.

## Review / release prerequisites

- New migration `20260914191309_request_item_edit_receipts.sql` requires independent review and exact production target approval before application. Website UI/action must not be released without it.
  SHA256: `53a7a3da5a77cd6779393324a8e6753cc5718be503f40ee1b2017b752e5ed0d5`.
- Parent/reviewer owns integration on the coordinated candidate, preserving Step2 product accordion/autosave and Step3 corrections. No direct push/deploy by this workstream.
- Safe receipt/Undo currently covers organized product answers/details, NOT legacy original intake source editing or product-group changes. Those existing actions remain separate; do not claim universal undo/autosave.
- Full detail editing preserves unresolved flags conservatively rather than treating arbitrary text as technical approval. Technical equivalence is not inferred.
- All browser fixtures are synthetic; no actual customer edits, provider API calls, supplier discovery or messages were exercised.

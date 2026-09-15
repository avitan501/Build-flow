# Coordinated request release — final publication gate

> Historical release record. The checkpoint headings, pending gates, and exclusions below describe their original snapshots, not the current application. For subsequent implementation, database, deployment, and live-test results, read [Remaining work continuation — 2026-09-15](request-finish-today-2026-09-15.md). In particular, do not infer that payroll, AI extraction, or mixed-client drafts remain unimplemented from the older exclusions here. A candidate or migration record is not proof of a verified live application; use the latest explicit deployment and live-QA checkpoint. This notice does not certify a new deployment.

## Current frozen release (supersedes historical checkpoints below)

User explicitly reauthorized publication of today's approved work. Root candidate `ca908e3d` plus test-only `e730deb2` preserves live base `8c79820c`. Root is the only production publisher. Primary dirty workspace remains untouched.

Integrated: compact Step1/2/3 and progress/activity; private per-step assignee/note/completion; existing-item autosave, retained conflicts, resume/Undo/source-change review; persistent per-product supplier choices; source-backed human product matching; immutable real multi-supplier allocations; mixed client/PDF totals and displayed-snapshot save/send protection; guarded existing Edge transport. Request-list cleanup and communications already on base are preserved.

Final migration order and SHA256:

1. `20260914175308_request_workflow_steps.sql` — `7d8b6e4a8303c85f3aba538b59fceeed479514552e5b3a9c9cfbd421639cadfd`
2. `20260914191309_request_item_edit_receipts.sql` — `53a7a3da5a77cd6779393324a8e6753cc5718be503f40ee1b2017b752e5ed0d5`
3. `20260914191336_product_choice_autosave.sql` — `75a356c0ad59fe238dc51631552bacd9c570ec09c10a11539ef12980bbdf831e`
4. `20260914225145_request_source_attachment_fence.sql` — `10f241b372b0a644bda4a03bf89c9fb807f2496aff930e9a8116a496d17da6ca`
5. `20260914225701_trusted_product_match.sql` — `5e09c55167a5ed60386271cd55a51d9d6e11221809b39d71ca65a0108334edb6`
6. `20260914230638_quote_comparison_finalized_routes.sql` — `d9521be0ca183572c1f43d50ecb6a5384df52216f35543dcca81cef8a10071ee`

Root independently rehearsed all six against captured live schema metadata with synthetic records: PASS, 129 constraints/28 triggers. Includes displayed client CAS, legacy/direct-DML bypass guards, ordered attachment claim, once-only/ambiguous/confirmed dispatch, revoked actors. No real provider send.

Root final application build (webpack, isolated dependency symlink) passed153 routes and TypeScript; lint0 errors/31 existing warnings. Independent Edge22 tests and full cached Deno check passed. Broad104-check run exposed two obsolete single-bid-only source assertions; corrected to require legacy OR persisted route, then21 comparison checks passed. Final combined styled/browser and release regressions recorded in subsequent publication checkpoint.

Required rollout: six SQL in order on confirmed `nprfhspwdflpqlopydmp` → verify schema/grants → deploy only `send-supplier-quote` with `_shared/claimed-client-quote.ts` and existing JWT verification → serialized canonical/mirror app publication → exact-SHA authenticated live check. SQL5 safely disables the old award RPC during the transition; SQL6 must precede Edge because its legacy guard reads `active_route_id`. Do not restore an unsafe RPC or ship app before dependencies.

Live before cutover independently verified through Vercel deployment `dpl_CLLCppHC9nQapf8bxeFbdNKo6BiM`, canonical domain and `/api/release`: `8c79820c`, production Supabase `nprfhspwdflpqlopydmp`. No production mutation yet at this checkpoint. Payroll and AI safeguards are separately queued; full sitewide autosave, partial financial ledger, full PDF extraction/provider success are NOT represented as complete.

## Historical checkpoint (superseded by current release above)

Owner: root/release reviewer. Worktree `/tmp/avantia-request-coordinated-release-20260914`, branch `codex/request-coordinated-release-20260914`.

## Current integrated base

- Live preserved: `8c79820c767fbf49f0e239678bd4fa82886df983` (request-list cleanup, communications, Company screen).
- REQ03/04 + delivery coverage + navigation isolation: integrated as `9bf8b71f`, `7900ee78`, `668e7291` (equivalent to prior reviewed `154efb31`).
- Product-first Step2 and truthful quote-entry count: `b903694b`, `753cf9d3` from `edf37e98`, `12dc59d3`.
- Step1 source/clarity and routing placement: frozen `6fcb15a6` + `5c9f91b6` independently reviewed and integrated as `fc54ddf1` + `2fad0f32`, without conflicts. Original-only products keep their supported editor; AI-only controls are not offered for those rows.
- Step3 compact UI + both review fixes: `f1a35eb7`, `9a41cc92` integrated as `08efd51a`, `9420c3ce`; active phase and saved subtotal/delivery/tax/total now align.

## Narrow product-choice autosave

Old `137ffe5a` is NOT cherry-picked wholesale. Its complete client autosave and price/award materialization changes are excluded. Recover only the safer shared queue/hook from `c5038c63`, and adapt old source-revision invalidation to a small draft containing product-to-bid choices.

- Draft choices persist separately from actual supplier award, orders and customer quotes.
- Server requires supplier capability, validates eligible current item/bid pairs, checks source fingerprint and uses atomic revision + unlocked-state update.
- Source changes invalidate in-flight saves; changed amount/unit/quantity/match/exclusion means previous choices require review, not automatic reuse. Old draft is preserved until a new explicit choice.
- Account/request scoping, serial debounce, retained errors, retry and conflict reload are supplied by reviewed controller.
- Existing bid-price Save buttons are intentionally unchanged. Unsaved price edits prevent selecting against a different displayed price. UI says specifically product choices saved, never whole-site autosave.
- Preview/sample remains temporary and says not saved.
- Other existing server actions flush the choice queue first, preventing refresh from silently discarding a pending choice.

## Provisional migration manifest (not approved or applied)

| Migration | SHA256 | Purpose |
| --- | --- | --- |
| `20260914175308_request_workflow_steps.sql` | `7d8b6e4a8303c85f3aba538b59fceeed479514552e5b3a9c9cfbd421639cadfd` | Private per-step assignee/note/state/CAS; exact approved actor RLS |
| `20260914191309_request_item_edit_receipts.sql` | `53a7a3da5a77cd6779393324a8e6753cc5718be503f40ee1b2017b752e5ed0d5` | Service-only revision-checked organized-item edits and private same-actor Undo receipts |
| `20260914191336_product_choice_autosave.sql` | `75a356c0ad59fe238dc51631552bacd9c570ec09c10a11539ef12980bbdf831e` | Bounded choice JSON, revision/fingerprint, source invalidation triggers; preserves existing supplier-staff RLS |

The three migration hashes above were rechecked on integrated `2fad0f32`. Root must approve this exact manifest and independently confirm active production ref `nprfhspwdflpqlopydmp` before any production DDL. No migration, push, hook, deployment or customer mutation has occurred here.

## Step1 independent integration review

- Existing actor/request-keyed provider, private step state, partial-delivery coverage guard, Step3 phase/totals fixes and product-choice autosave remain intact.
- Organized edit RPC is service-only with an independent active/approved signed-email role check; it locks source/item rows and checks both snapshots before writing. Undo is same actor, unchanged source and exact after-snapshot only. Receipts are not exposed through customer-visible event metadata.
- Original editor resets its draft from the currently selected product on each open. Source changes return a conflict rather than overwriting another worker's edit.
- Position persistence stores only selected item/question IDs, scoped to actor and request. No original descriptions or notes are written to browser position storage.
- Supplier routing now renders primarily inside Step2; existing route writer and supplier discovery actions are reused. No automatic supplier contact was added.
- Original-only edits and grouping remain outside the new organized-product Undo contract. This is not universal autosave, source re-extraction, or the unfinished partial financial ledger.
- Final integrated checks on code `2fad0f32`: webpack build153 routes PASS; standalone `tsc --noEmit --incremental false` PASS; full lint0 errors/31 baseline warnings; 7 release guards PASS; 51 focused action/controller/helper/render tests PASS; 22 Step1/Step2 fixture/browser tests across Chromium and WebKit at390/1440 PASS; 23 release regressions PASS. Total103 checks across these suites, not103 distinct end-to-end customer flows.
- Fresh built-code sample screenshots visually reviewed: `/tmp/step1-review-chromium-desktop-390.png`, `/tmp/step1-review-wide-chromium-desktop.png` and corresponding mobile-safari screenshots. These are62-product fixtures, not live customer records. Browser POSTs are blocked in the fixture tests.
- Bounded secret-pattern scan of added code reported0 matches; `git diff --check` clean. Production fixture gate checked independently by restarting without `AVANTIA_LOCAL_UI_TEST` and confirming404. Owned local server stopped after checks.

## Evidence at checkpoint

- Independent Step2 review: 15 focused/render/browser tests passed with existing local sample at 390/1440, POST blocked; candidate screenshots inspected.
- Combined focused tests: 55 passed including 390/1440 product workflow, fulfillment, private step proof, controller, source helpers and executable mocked server-action tests. Action cases cover correct save, read/write-time conflict, locked/foreign/mismatched evidence and unauthorized denial.
- Disposable network-none PostgreSQL 16: migration applied successfully, bounded-schema check, successful draft update, stale CAS zero rows, parent/child invalidation, locked-state CAS zero rows, nonstaff RLS denied and anon direct-write denied. Authorized definer supplier write still invalidates draft.
- Two concurrent transactions with the same expected revision returned UPDATE 1 then UPDATE 0; no lost overwrite.
- SQL fixture uses simplified local RLS predicates, not a production database/auth validation. Actual endpoint/browser persistence after reload remains a final gate.
- Interim combined webpack build passed153 routes; standalone TypeScript passed; full ESLint0 errors/31 existing warnings; 7 deployment guards +23 release regressions passed. Local app server stopped after checks. A test-only widened literal initially failed TypeScript and was corrected before the successful run.
- These checks precede Step1 integration and do not replace final frozen-candidate build/browser/end-to-end gates. No authenticated browser-to-database persistence claim yet.

## Explicit exclusions and remaining work

Payroll `508c8213`, AI `4be39d00`, incomplete partial financial ledger/PDF prototype, and client quote autosave/send claim are not included. Original client save/send race remains tracked in `docs/autosave-inventory-2026-09-14.md` in the separate foundation worktree.

Remaining release gates: root approval of exact three-migration manifest; independently confirm active production binding; controlled authenticated browser-to-database verification of step state, organized edit/Undo, product-choice reload and conflict behavior on safe test records; one serialized publication and exact-SHA live verification. Local tests and SQL fixtures do not establish live Google login, complete authenticated customer-to-payment workflow, provider delivery or production persistence. No production changes have been made by this integration task.

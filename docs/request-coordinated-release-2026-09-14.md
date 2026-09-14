# Coordinated request release — HOLD until final verification and migration approval

Owner: root/release reviewer. Worktree `/tmp/avantia-request-coordinated-release-20260914`, branch `codex/request-coordinated-release-20260914`.

## Current integrated base

- Live preserved: `8c79820c767fbf49f0e239678bd4fa82886df983` (request-list cleanup, communications, Company screen).
- REQ03/04 + delivery coverage + navigation isolation: integrated as `9bf8b71f`, `7900ee78`, `668e7291` (equivalent to prior reviewed `154efb31`).
- Product-first Step2 and truthful quote-entry count: `b903694b`, `753cf9d3` from `edf37e98`, `12dc59d3`.
- Step1 source/clarity and routing placement: another agent owns it, not yet integrated.
- Step3 compact UI + both review fixes: `f1a35eb7`, `9a41cc92` received; not yet integrated at this report checkpoint.

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
| `20260914191336_product_choice_autosave.sql` | `75a356c0ad59fe238dc51631552bacd9c570ec09c10a11539ef12980bbdf831e` | Bounded choice JSON, revision/fingerprint, source invalidation triggers; preserves existing supplier-staff RLS |

Step1 may add its own approved migration. Root must review the final manifest and independently confirm active production ref `nprfhspwdflpqlopydmp` before any production DDL. No migration, push, hook, deployment or customer mutation has occurred here.

## Evidence at checkpoint

- Independent Step2 review: 15 focused/render/browser tests passed with existing local sample at 390/1440, POST blocked; candidate screenshots inspected.
- New choice/controller tests: 18 passed (behavioral/helper + source contracts).
- Disposable network-none PostgreSQL 16: migration applied successfully, bounded-schema check, successful draft update, stale CAS zero rows, parent/child invalidation, locked-state CAS zero rows, nonstaff RLS denied and anon direct-write denied. Authorized definer supplier write still invalidates draft.
- Two concurrent transactions with the same expected revision returned UPDATE 1 then UPDATE 0; no lost overwrite.
- SQL fixture uses simplified local RLS predicates, not a production database/auth validation. Actual endpoint/browser persistence after reload remains a final gate.
- Scoped ESLint passed; combined build in progress. No claim final combined build/browser/end-to-end success yet.

## Explicit exclusions and remaining work

Payroll `508c8213`, AI `4be39d00`, incomplete partial financial ledger/PDF prototype, and client quote autosave/send claim are not included. Original client save/send race remains tracked in `docs/autosave-inventory-2026-09-14.md` in the separate foundation worktree.

Final gates: integrate frozen Step1/Step3 without logical overwrite, final exact migration audit, full regressions/lint/build/standalone TypeScript, phone+desktop complete request flow and autosave failure/reload checks, secrets/diff scan, then root exact migration/publication approval and one serialized release with live verification. No reliable wall-clock deadline while component candidates remain unfrozen.

# REQ05 compact Step 3 — local candidate

## Review corrections, September 14

Correction worktree `/tmp/avantia-step3-review-fixes-20260914`, branch `codex/step3-review-fixes-20260914`, based on `154efb31` plus original compact UI cherry-pick `f1a35eb7` (source `cce397c4`).

- Current phase now follows `workflow.step3Action`. A paid legacy request without earlier history advances to receipt/delivery; missing historical completion flags remain false and are described as not recorded. No fabricated estimate approval or completed delivery.
- Subtotal, delivery, sales tax and total use the same saved document snapshot and arithmetic as the headline total. Unsaved editor changes cannot alter that breakdown.
- Changed files: overview and management panel, new `lib/request-fulfillment-presentation.ts`, regression specification and this report. Step 2, handlers, completion guards and database code were not changed in this correction.
- Verification: 45 targeted workflow/completion/render/browser tests passed, including actual component with compiled CSS at 390px and 1440px, keyboard accordion operation and no horizontal overflow. Both fixture screenshots visually inspected. These are isolated synthetic fixtures, not authenticated live action verification.
- Production webpack build passed with 153 routes; standalone TypeScript and diff whitespace checks passed. Full lint passed with zero errors and 31 existing unrelated warnings. Changed-file secret-pattern scan found no credentials. No external sends, provider calls, payments, database mutations, push or deployment.
- Parent owns master-context updates and serialized integration. Authenticated combined Step 1/2/3 verification remains a release gate; partial financial/delivery ledger remains separate unfinished work.

Branch/worktree: `codex/request-step3-design-20260914`, `/tmp/avantia-request-step3-design-20260914`. Based on `c6b8138f`, with isolated release-safety fixes `e1bb21f6` (all-current-item delivery coverage) and `71fa1fdf` (request/account draft isolation).

## Implemented

- Approved five-phase desktop progress and compact mobile bars.
- One saved-document card uses the actual saved number, total, update timestamp and manager preview link. No invented send time, approval or delivered status.
- One primary next action, with existing handlers and their confirmations unchanged.
- Price breakdown, saved document history/actions, payment/receipt and delivery details behind three collapsed sections.
- All existing contact, estimate, invoice, receipt, payment-link and delivery tools retained.
- Partial schedules say Partly scheduled; scheduling explicitly does not confirm delivery.
- Frontend-design guidance applied as a restrained adaptation of the approved concept, retaining the existing site styling.

## Verification

- `npm run build -- --webpack`: passed compile, TypeScript and 153 routes.
- Four render/browser checks passed, including 390px and 1440px, native keyboard accordion activation and no horizontal overflow.
- Delivery coverage + step state contracts: eight passed.
- Changed-file lint and `git diff --check`: passed.
- Fixture screenshots `/tmp/request-step3-compact-390.png` and `/tmp/request-step3-compact-1440.png`. Phone screenshot visually inspected. These are synthetic fixture screenshots, not claims of live verification.
- No secrets added; no migrations, production writes, sends, charges, requests deleted or deployments.

## Remaining release gates and PART01

Root/release agent must integrate on the latest live commit, verify authenticated request behavior and publish serially. This candidate does not claim the new partial financial workflow is implemented.

PART01 must introduce independent immutable invoice snapshots and per-item quantities. Current legacy document storage upserts one row per request/document type, and its line snapshots have no reliable source-item IDs. Preserve those records; do not infer historical allocations by fuzzy description matching. Unknown historical invoices must be visibly reviewed before a remaining balance is claimed.

Planned separate ledger: revisioned drafts; explicit issue/send; unique immutable invoices; per-invoice payment records/balances; quantity-based schedule/dispatch/delivery batches with explicit actual delivery; atomic over-allocation checks. Scheduled is not delivered and partial payment/delivery is not whole-request completion. Exact migration and production binding review remain mandatory before production DDL.

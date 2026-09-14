# Mixed supplier finalization — implementation plan, not implemented

Owner proposal: release-review agent owns the durable route slice after root grants ownership; Noam retains trusted-match confirmation/schema until frozen. Root integrates sequentially. Do not edit Noam's match helpers/RPC while that work is active.

Root approved foundation implementation after this plan: new schema/helper/route-actions/tests first; existing UI/actions/page wiring waits for Noam's frozen trusted-match handoff. Lead time is optional: retain unknown as null in display and snapshots, never require it for finalization. Freight/tax terms are required. Narrow display fix preserves this distinction.

## Current boundary, verified from code

- `components/buildflow/quote-comparison-workspace.tsx`: product selections are saved drafts. Mixed analysis does not consume manual selections; its option has no finalize handler. ClientQuoteBuilder receives one selectedBid.
- `app/admin/quote-comparison/actions.ts`: award and send use one awarded_bid_id.
- `lib/request-step-completion.ts`, request detail page and request action completion guard require that single selected bid to cover every current material.
- Existing mixed freight/tax UNKNOWN values are excluded by lowestSupplierPriceByItem before mixed aggregation. The verified display defect is unknown lead time becoming0/complete; earlier broader freight/tax claim was corrected. The legacy lowest-line helper also lacks product-match checks and must use Noam's trusted evidence predicate before it feeds a finalized route.

## Durable model (additive; no virtual supplier)

Create with a generated migration only after approval:

1. `quote_comparison_routes`: immutable finalized version header (`id`, `comparison_id`, `request_id`, `created_by`, `created_at`, `draft_revision`, `source_fingerprint`, `idempotency_key`). Unique `(comparison_id,idempotency_key)` and `(comparison_id,id)`; keep old route versions for audit. State `finalized/superseded` and timestamps if explicit reopening replaces a route.
2. `quote_comparison_route_items`: `(route_id,item_id)` primary key; current source request-item ID, actual supplier ID, source bid ID, quoted price-key `(bid_id,item_id)`, quantity/unit, unit cost, supplier description/source reference and trusted match confirmation revision/snapshot. One full-request quantity allocation per product in this first slice. A supplier can cover a subset of products, but one product is not split across quantities yet.
3. `quote_comparison_route_suppliers`: `(route_id,supplier_id)` primary key; actual supplier identity snapshot, included source bid IDs, material subtotal, explicitly confirmed freight/tax basis/rate/tax amount/lead time, computed landed total. Do not double-count freight when two quote versions belong to the same physical supplier. If the applicable combined freight/tax terms are ambiguous, block finalization until explicitly resolved; never choose0 or combine incompatible quote terms automatically.
4. Add `quote_comparisons.active_route_id`, constrained to a route of that same comparison. Keep legacy `awarded_bid_id` unchanged for existing quotations. New mixed routes use `active_route_id` rather than a synthetic bid or supplier. Status can remain existing awarded only after consumers are migrated to recognize either valid legacy award or active route.

Tables staff-private with explicit supplier capability RLS, indexes on foreign keys, no customer-write policy; immutable financial/source snapshots writable only through guarded RPCs. Do not backfill or rewrite old sent/paid quotes. Parent deletion retention/cascade must follow existing business retention rules; do not silently introduce destructive cascades for finalized records.

## Write contract and locking

New dedicated server file `app/admin/quote-comparison/route-actions.ts`, action `finalizeProductChoicesAction({comparisonId,expectedDraftRevision,expectedSourceFingerprint,idempotencyKey})`. Authenticate supplier capability; browser supplies no authoritative prices, totals, supplier identity or match verdict.

One transactional `staff_finalize_quote_comparison_route` RPC must:

- Lock comparison, then source items/bids/prices/confirmation rows in deterministic order. All participating save/reopen/award RPCs must follow compatible parent-first locking; audit existing child-write invalidation triggers to avoid deadlock inversions. Direct concurrent updates must cause source-version conflict or safe rollback, never a route that silently uses mixed versions.
- Compare expected draft revision/fingerprint and current unlocked parent state. Read persisted choices, not caller allocations; require exactly all current effective request products, no unknown/duplicate/stale items, quantities, units or prices.
- Apply Noam's server/DB trusted-match predicate. Partial availability, unavailable lines, changed evidence, declined/blocked suppliers and incomplete freight/tax terms block finalization. Explicit zero freight/tax is valid; unknown is not.
- Compute item and supplier totals on server using decimal cents and explicit tax basis; capture source quote identity and match version. Do not infer global cheapest landed combination from individually cheapest material prices.
- Write immutable route/header/supplier/item rows and parent active_route_id atomically. Same idempotency key returns the same completed route; failed transactions leave no partial active route.
- Keep source fingerprint separate from finalization's own status/active_route_id changes, so committing a route does not invalidate itself. Any later source edit marks the route stale through a source revision check; never mutate the frozen financial snapshot to match new prices silently.

This finalize action does not send an order, message, invoice, quote or payment request. Any existing send remains explicit and uses a reviewed immutable route/client snapshot.

## Exact read/UI/client integration ownership

After Noam freezes match work, release-review owns:

- New `lib/finalized-procurement-route.ts`: typed discriminated union for existing single-supplier route vs immutable mixed allocation, normalized item-cost map and participating supplier totals. Never construct a fake QuoteComparisonBidRecord to satisfy old APIs.
- Comparison detail page: load active route + allocations + supplier snapshots; pass typed route and stale state.
- Comparison workspace: flush choice autosave, then one explicit finalize using acknowledged draft revision; failure keeps choices and requires review. After success open Step3 via real route, not selectedBidId. Label and calculations use actual persisted manual choices, not regenerated cheapest choices.
- `components/buildflow/client-quote-builder.tsx`: accept typed procurement route; per-product markup/profit uses allocated supplier cost, not one bid. Existing one-bid callers use the legacy adapter. `canPrepare` requires current complete route and existing client criteria.
- `lib/quote-comparison.ts`: new route-aware client summary function; old function delegates to legacy adapter for unchanged historical behavior. Supplier costs/freight/tax are internal; customer sale prices, customer delivery and customer tax remain independently chosen. Never sum supplier sales tax into customer tax or override saved client totals.
- `app/admin/quote-comparison/actions.ts` + client-save RPC: permit current active route OR legacy awarded bid, validate exact route revision before save/send; preserve explicit sends and sent/accepted snapshots. Build PDF from the same saved client summary. Existing client save/send concurrency weakness must not be broadened; use immutable reviewed route/client revision for dispatch.
- `lib/request-step-completion.ts`, request detail page and dedicated completion action: shared route-proof validator covers all current effective products once; partial A+B coverage can complete only when their union is full and finalization is saved. Draft/partial/stale routes never complete Step2.
- `request-management-panel.tsx`: recognize active route as winningSupplierSelected while keeping supplier identities/provenance in details and existing payment/delivery gates. Step3 totals must use the same immutable client document snapshot as its PDF, not recalculate historical amounts.

Root owns final migration manifest, integration and deployment. Noam owns trusted-match helpers/confirmation schemas until his handoff. Maya owns original-only page/ReviewList changes until frozen. The above page/actions/workspace handoff must be serialized; no two agents edit the same worktree.

## Acceptance gates before claiming end-to-end complete

- A provides product1 only, B product2 only; both verified: explicit finalize produces2 real suppliers, full item union, one freight charge per participating supplier and correct per-supplier tax; Step2 can complete and Step3 uses those exact costs.
- Manual override away from cheapest survives reload, finalization, client editing and generated PDF; automatic recomputation cannot replace it.
- Missing one product, changed quantity/source, missing match proof or unknown freight/tax: finalize blocked, draft retained, no active route/Step2 completion.
- Same supplier appears in multiple quote versions: combined terms must be resolved, no duplicate freight or fake third supplier.
- Retry/double-click returns one route; two workers finalize from one revision, only one wins; changing price/evidence during finalize never mixes snapshots.
- Source edit after finalization marks current route stale without rewriting historical sent/paid quotes; send/Step2 guards require review.
- Existing single-supplier saved/sent/accepted/paid quote remains readable with exactly the old totals and supplier identity.
- Phone390 and desktop1440: product choice -> finalize -> Step3 works; no send occurs from finalize; unauthorized/customer RPC calls denied; failures never show Saved/Done.

Not part of this slice: split quantities of one product between suppliers, partial invoices/payment allocation, partial delivery ledger or automatic purchasing. Those require their own financial/fulfillment records rather than extending a draft route by implication.

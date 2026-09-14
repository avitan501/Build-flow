# Mixed route foundation — NOT a release candidate alone

Base `64ceec7a`, branch `codex/mixed-route-foundation-20260914`, isolated worktree `/tmp/avantia-mixed-route-foundation-20260914`. Root approved this bounded schema/helper/action foundation, with existing UI/client wiring deferred until Noam's trusted-match work is frozen.

## Implemented

- Three staff-private immutable-version tables preserve real per-product allocations, participating directory supplier IDs, source bid/price/request identity, match evidence snapshots and per-supplier financial terms. Existing single awarded_bid_id values/documents are not changed or backfilled.
- Directory IDs are TEXT in this application (not a suppliers table UUID). Imported `directoryId:quoteId` bids retain the real directory ID and separate source bid identity. Multiple source bids for one physical supplier currently fail closed until combined terms can be explicitly resolved; no duplicate freight or virtual supplier is invented.
- Service-only RPC authenticates a signed approved actor, locks comparison then request parent/rows and comparison items/bids/prices/match evidence in stable order, compares the same raw request snapshot validated by the website, consumes saved choices and requires full verified coverage. It calls Noam's `quote_product_match_is_eligible` under those locks.
- Explicit finalize uses current saved manual selections, not recomputed cheapest choices. Server/SQL calculate each supplier's subtotal, freight and tax once. Tax basis is explicitly persisted as the existing application rule `materials_and_delivery`; supporting non-taxable freight or a supplier's conflicting fixed-tax quotation remains a terms-resolution requirement, never silently assumed equivalent.
- Optional lead time remains null; required freight/tax may be explicit zero but not unknown/invalid. Retry key produces the same route. No send/order/invoice/payment action is invoked.
- New website action validates current effective request products before service RPC and passes the raw request snapshot for transactional comparison. New normalized route types avoid fake QuoteComparisonBidRecord adapters.

## Migration/dependency

Generated migration `20260914230638_quote_comparison_finalized_routes.sql`.
SHA256 `4fedd618425b7444bf2137406ede144ef8c9c5c763f6e4d92df1803f73d61cd8`.

Requires Noam's `20260914225701_trusted_product_match.sql` first. Local tests used actual dependency SHA256 `c5425b9e7a7b7d1278e59579968c9539aa3b77c562766a80d4dc8888d98f26a3`, not a mocked eligibility predicate. Root must review final combined hashes again after Noam freezes.

Foreign keys intentionally retain finalized records and source references rather than cascade-delete financial history. Existing delete/reopen behavior for NEW finalized routes must be wired deliberately (archive/history), not silently bypassed. No existing records are changed by schema creation.

## Verified locally

- Actual PostgreSQL16 network-none fixture loaded both migrations; manual A/B allocation produced70 materials+30 freight+7.50 supplier tax=107.50, not the cheaper unselected alternative.
- Two actual suppliers/item allocations, null optional lead time, no invented awarded_bid_id, duplicate retry returns one route.
- Unauthorized actor, stale draft revision, unknown tax and unsafe product wording rejected without partial route records.
- Owner RLS read allowed, unauthorized staff read0, authenticated route insertion/financial overwrite and direct finalize execution denied.
- Four source-coverage tests pass (full current coverage, partial/duplicate/stale quantity/spec rejection, attachment fence retained in raw snapshot). Changed-file lint, build153 routes and post-build standalone TypeScript pass. The pre-build standalone check initially lacked Next-generated RouteContext; production build generated it, and the subsequent standalone check passed. Disposable local database container was stopped/removed.

## Remaining before this can ship

This foundation alone must NOT be deployed: calling finalize creates active_route_id while old UI/client/Step2 still expects one awarded_bid_id. Await Noam's frozen commit, integrate it, then implement route reads/current-proof validation, the explicit finalize button, client builder/summary/PDF and Step2/Step3 adapters together. Preserve root's refresh dedup work and Maya's original-only changes.

Still required: executable server-action failure tests; two-session finalize/source-edit concurrency against full invalidation triggers; raw request change race; multiple-version same-supplier terms flow; immutable route freshness/reopen policy; combined client save/send guard; final phone/desktop workflow, full regression/build and authenticated safe-record tests. Source edits after finalization must be detected without rewriting historical snapshots. Partial quantity allocations, partial billing ledger and automatic purchasing are excluded.

No production schema, push, deployment or business communication has occurred.

# Mixed per-product supplier finalization — integrated candidate

Owned tree: `/tmp/avantia-mixed-route-foundation-20260914`.
Own chain: `3b9b0d6e` foundation → `219cda9d` real allocation pricing → `30d4c0fa` workflow/client wiring → this follow-up. Root integrates these onto its coordinated candidate; do not deploy this branch separately.

## Implemented

- One explicit finalization consumes the acknowledged autosaved per-product draft revision. It does not silently substitute the algorithm's cheapest choices, invent a supplier, or send orders.
- Immutable real supplier/item allocations retain source bids, request row identity, original evidence, explicit freight/tax and optional unknown lead time. Two quote versions for the same supplier fail closed pending combined terms.
- Full current request coverage and trusted source matches are checked under parent/source locks. Child NOWAIT prevents deadlock with legacy child-first writers; retries never leave partial routes.
- Client builder, real PDF, request Step2 proof and Step3 readiness recognize the active route. Mixed landed cost is separate from client markup/delivery/tax. Legacy single-bid arithmetic remains unchanged.
- Client save compares the displayed client snapshot under locks and returns the acknowledged snapshot. Sending checks both that acknowledgment and the exact loaded PDF input against the locked database state.
- Ordered PDF/attachment SHA256/name/byte manifest and signed actor are persisted with the send claim. Web mixed sends use the coordinated Supabase Edge adapter, not the legacy single-bid reconstruction or an unconfigured website provider.
- Durable dispatch claim transitions first → ambiguous while in flight → provider receipt. Ambiguous attempts never blindly resend, even after provider idempotency expiry.
- DB parent/item guards prevent direct DML rewriting a claimed client copy. Legacy reopen refuses route-backed comparisons. Financial allocations and send manifest/snapshot are immutable after their one-way seal/claim.
- Existing tall client preview modal was centered outside the viewport; top-aligned scrolling now keeps Close reachable on narrow and wide screens. Claimed/sent client data is read-only while the saved preview remains available.

## Migration contract

`supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql`

SHA256: `d9521be0ca183572c1f43d50ecb6a5384df52216f35543dcca81cef8a10071ee`.

Requires the coordinated five predecessor migrations including final trusted-match SQL. Root/Noam independently rehearsed all six against actual live metadata. Maya owns the required `send-supplier-quote` mixed-route adapter. SQL + Edge + web are a coupled release; no migration, email, push or deployment was performed by this agent.

## Verification

- Local isolated PostgreSQL foundation, source freshness, client draft/claim/provider state, RLS, legacy reopen and direct DML tests passed.
- Actual two-session tests with real product-choice invalidation triggers: finalize/client evidence return NOWAIT55P03, not deadlock; all state unchanged after rollback; uncontended explicit retry succeeds.
- Actual React ClientQuoteBuilder Chrome/WebKit tests: real A/B costs, client143.00 preview, acknowledged save→send snapshot, stale route disabled. Styled390/1440 exposed then verified the preview-close correction.
- Real generated branded PDF was parsed: Valve + Pipe +143.00; no107.50 supplier cost or profit leaked.
- Earlier integrated build153 routes and standalone TypeScript passed; full lint0errors/31existing warnings and7release guards passed. Final post-follow-up build and targeted reruns are in progress at handoff; root must run final combined gates.

## Explicit limits / release gates

- No actual client email or live financial mutation was tested here. Authenticated live read-only checks and exact SHA/schema/Edge binding verification remain root release gates.
- A provider timeout remains an ambiguous durable attempt requiring provider-history review; there is intentionally no blind retry or automatic claim reset.
- Reopening a sent/claimed route requires a new comparison; historical financial snapshots cannot be overwritten.
- Partial coverage cannot finalize. A full partial billing/delivery ledger, legacy supplier import replacement repair and broad sitewide autosave are outside this batch.
- Existing supplier import may attempt delete-all/reinsert; finalized allocation FKs fail closed. This candidate does not claim that legacy importer is repaired.

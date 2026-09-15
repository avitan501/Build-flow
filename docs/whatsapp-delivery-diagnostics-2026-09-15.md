# WhatsApp delivery diagnostics — 2026-09-15

## Scope and ownership

Continue the local-chat handoff: preserve working inbound/replies, diagnose failed Utility-template initiation, retain safe asynchronous Meta error codes. No schema changes, registration changes, credentials changes, other WABA changes, contact merges, AI setting changes or outreach.

Sole current implementer: WhatsApp campaign task. Task-list overlap checks showed local activation task idle and Website fix not loaded. Isolated worktree `/tmp/avantia-whatsapp-delivery-diagnostics-20260915`, branch `codex/whatsapp-delivery-diagnostics-20260915`; primary worktree's 142 dirty/conflicted paths preserved. No concurrent publisher observed. Production publication requires explicit approval and a fresh coordination/live-version check.

## Verified baseline

- Canonical `https://avantiabuild.com/api/release`: `d66c4ff519377d65325740c180f81a07e135fab8`, production, Supabase `nprfhspwdflpqlopydmp`.
- Supabase broker version **193**, bundle SHA `55f1e1afa9b703bf5d9c21382e45bb6c011e0f2432cc1954ee1fa9e04b0c6452`. All seven downloaded deployed source files exactly matched canonical commit content (not just origin/main).
- Deployed receipt handler discarded `receipt.errors`; it only updated status/timestamps and linked request state. No retrospective cause can be recovered from that omitted data.
- Failed template `0749e63d-3b83-4b1d-baf0-7b7ee8298eae` remains Failed, 2026-09-15 22:44:26.831 UTC, no next steps.
- Incoming `43cbcb85-d203-4516-b414-bb2b6bc58f8e` received 23:16:04 UTC.
- Reply `0e8d1bca-5a52-4a2f-9c6b-d6aa91aa017f` is **Read**, last event 23:17:42.370521 UTC. Recipient ends 5077.
- Safe Vault comparisons confirmed Meta provider, app `2874339416276903`, WABA `1609047970612779`, phone ID `1266268263238386`, sender `+15169901990`, Graph v25.0; credential presence only, no secret output.
- Stored health check 23:26:16.913 UTC: healthy, callback active, WABA subscribed, phone ready, quality GREEN. Token scopes were not independently enumerated; successful replies and the health check are operational evidence, not proof of every permission.
- Handoff reports default Mastercard ending 1272 saved manually, US billing, business contact phone already corrected. No payment changes here. Original country restriction cause unknown.

## Local changes — NOT DEPLOYED

- `_shared/whatsapp-delivery-diagnostic.ts`: bounded, deduplicated numeric Meta error codes only. Arbitrary titles/messages/details intentionally excluded to avoid storing tokens/PII. Safe generic instruction names exact codes without guessing the cause.
- Broker: receipt audit uses existing `aura_webhook_events` in the same SQL statement as status update. Stores status/codes only plus existing message ID; marks evidence processed, so inbound retry workers do not replay it. Unique receipt key is message+status. Failed-message guidance uses existing `next_steps`, already rendered in the inbox. Unrelated notes preserved; diagnostics cleared after Delivered/Read. Propagate effective stored status to linked requests, not a stale failed callback after Read.
- Inbox success copy now states accepted, delivery unconfirmed instead of “sent and saved.” Existing Accepted/Queued labels stay distinct from Delivered.
- Evidence is retained even if a callback precedes the communication row. Automatic reconciliation of such early receipts is not implemented in this patch; inspect evidence if this race is encountered.

## Tests

- Four targeted Node tests PASS: codes/privacy/bounds, integration guards, acceptance wording.
- Actual extracted webhook handler exercised against isolated **PostgreSQL 17** in a network-disabled container: PASS. Covers failure, duplicate callbacks, failure→sent, delivered/read precedence, unrelated notes, early callback evidence, excluded raw content, invalid signature.
- Ten deployment guard tests PASS (mocked deploy hooks only).
- Twenty-three bounded application regression tests PASS.
- Full Next webpack production build PASS, 153 routes; route generation + TypeScript PASS; targeted ESLint + diff check PASS.
- Deno helper typecheck PASS. Whole broker Deno check has **95 pre-existing errors**; baseline and candidate produce identical counts by error code. Whole broker typecheck is NOT claimed clean. Initial Deno dependency-resolution attempt failed until using node-modules-dir=none. Initial standalone Next typecheck lacked generated RouteContext; passed after next typegen/build.
- No production test message sent. No production writes, deployment, migration or external message performed.

## Next gate

1. Obtain approval to publish scoped website + broker changes. Recheck active work, latest canonical release, function version/hash and target ref immediately before serialized publication; preserve any intervening approved change.
2. Publish only broker and exact required dependencies; record version and verify runtime/auth protection. Publish acceptance-copy change via existing approved release workflow, not incidental Git deployment.
3. Controlled approved Utility-template test to David ending 5077 **outside the service window**: earliest 2026-09-16 23:16:04 UTC / 19:16:04 New York, only if no later incoming WhatsApp message resets the window. Requery immediately before test. Do not test now and claim initiation proven.
4. Examine actual final callback/code before any further send. Fix only demonstrated cause within authority. If an account/payment restriction requires Meta or David, pause for that action.
5. Verify final Delivered/Read, incoming and reply regression, and safe diagnostics in live desktop/phone inbox. Duplicate contacts, AI Off, realtime refresh and old profile website remain observations, not authorized changes or proven causes.

The skill preflight still contains the retired domain: executed its content with only that URL replaced in memory by `https://avantiabuild.com/`, honoring AGENTS.md; no skill file altered.

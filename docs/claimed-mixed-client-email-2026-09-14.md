# Claimed mixed client quote transport — Maya

Isolated `codex/mixed-client-edge-send-20260914`, base `102ceeb0`. Edge/shared helper/tests only; reviewer owns website actions and SQL.

## Implemented

The existing `send-supplier-quote` Edge Function's `send_client_quote` action now has a separate `routeId` branch. It reuses that function's already configured `RESEND_API_KEY` inside Supabase; no secret copied to Vercel, no new vendor or assumed Vault secret name. Legacy single-bid/client-reply/supplier-request branches are unchanged.

Authenticated user/profile/grant checks precede the branch. Claimed actor must additionally match authenticated user. Frozen route snapshot supplies recipient, quote name, every client-priced line, message, delivery, tax and total. No arbitrary caller recipient/body or live single-awarded-bid reconstruction. Per-line rounding and tax match the website mixed-route summary.

PDF and ordered supplemental attachments must match immutable filenames, decoded byte lengths and SHA256 digests. The first artifact must be a PDF. Limits:11 files including PDF,25MiB combined. Validation completes before acquiring the durable provider-dispatch flag. Extra attachment/body/recipient inputs fail closed.

## Exact integration contract (reviewer SQL/action dependency)

Request `{action:'send_client_quote',requestId:comparisonUUID,routeId,deliveryId:claimToken,attachment:{filename,content:base64},attachments?:[{filename,content:base64}]}`.

Route SELECT fields: `id,comparison_id,client_send_token,client_send_actor_id,client_send_started_at,client_send_snapshot,client_send_manifest`. Manifest ordered array `[{filename,sha256:lowercaseHex64,bytes:integer}]`, PDF first. Bind snapshot and manifest in the same service-only claim; preserve immutability after claim.

Service-only RPC `staff_start_finalized_route_delivery(p_comparison_id,p_route_id,p_token,p_actor_id)` must atomically verify exact claim+actor and return `{status:'claimed'}` on first dispatch; `{status:'sent',providerId}` if confirmed already; otherwise `{status:'ambiguous'}` if dispatch began without confirmed provider ID. Never reset this flag after timeout or provider rejection. Durable guard outlives provider idempotency retention.

Service-only RPC `staff_finish_finalized_route_delivery` with the same four parameters plus `p_provider_id` records confirmed provider ID and returns `{ok:true}`. Wrong actor/token/scope must fail. RPCs must independently validate current approved actor, not merely trust Edge-supplied identity.

Confirmed duplicate returns success without another provider send. Ambiguous outcomes return409/502 and require explicit review. Provider accepted but failed DB confirmation is NOT reported as completed. Idempotency key remains `avantia-client-quote-${comparisonId}-${claimToken}` as extra protection.

## Tests / release gate

22 synthetic Deno tests cover mixed totals, actor/scope forgery, recipient/body injection, hashes/names/sizes, valid ordered supplemental attachments, non-PDF artifact, concurrent/repeated dispatch, ambiguous timeout and receipt persistence failure. Tests have no network or environment permissions and never send provider requests. Full modified Edge index passes cached Deno typecheck.

Root must review and integrate the matching SQL/action contract, run actual isolated PostgreSQL dispatch-race tests and combined application checks, then authorize coordinated migration/Edge/app release. No Edge deployment, production SQL, email send or secret operations performed in this task. Actual delivery remains unverified until an explicitly authorized internal test after release.

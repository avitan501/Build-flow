# Request RPC actor permission repair

Base: 4c79045e, isolated `codex/request-actor-helper-20260915`.
Migration: `20260915002415_request_actor_identity_helper.sql`.
SHA256: `03699d61318c98e70f2c67764b285b99c0cadb0136a0ac753d680a805957a835`.

Root live QA established production service_role cannot SELECT auth.users and has no private-schema USAGE. Nine new SECURITY INVOKER business RPCs directly joined auth.users for the signed actor check, so legitimate app writes failed. Earlier rehearsal incorrectly granted auth.users SELECT, masking the issue.

Repair adds only `public.request_staff_actor_label(uuid)`: SQL STABLE SECURITY DEFINER with empty search_path, reading auth.users plus profiles and returning David/Carlos/Staff/null. It enforces the same exact authenticated-email/role, active and approved predicate. EXECUTE is revoked from PUBLIC/anon/authenticated and granted only to service_role. No auth.users grants, private-schema grants, user/profile changes or business data writes are introduced.

The migration explicitly enumerates nine existing signatures and changes only their actor preamble. It rejects missing functions, a pre-existing SECURITY DEFINER business function, unexpected authorization text or residual auth.users references. First literal boundaries are used, not greedy SQL regex. Installed source fences, CAS, lock order, immutable allocation and delivery claim bodies remain intact; all nine business functions remain SECURITY INVOKER and retain existing ACLs.

Verification command:
`node tests/request-actor-permissions.local.mjs supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql d9521be0ca183572c1f43d50ecb6a5384df52216f35543dcca81cef8a10071ee`

Uses only own local `avantia-request-actor-20260915` PostgreSQL container with network none and generated disposable DB; reconstructs real metadata baseline and six core migrations, then applies repair. It explicitly revokes service_role auth.users SELECT and private USAGE before exercising item edit, source receipts/Undo fence, trusted match, mixed A/B/client CAS and send claim/provider-state guards. Additional assertions cover exact labels, inactive/unauthorized/mismatched-role denial, helper client denial and all nine invoker/service-only contracts.

No production SQL, app code, deployment, messages or provider calls performed. Root owns review/application and live browser retest. Existing b671 app is compatible with this database-only correction. AI extraction rollout remains separate and held.

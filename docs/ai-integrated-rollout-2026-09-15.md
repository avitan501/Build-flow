# AI package integrated rehearsal and release gates

Current rollout candidate rebased on verified live1efac76a, preserving its UI parity, PAY, actor permission repair and queued-only app safeguard. FullAIcb663a0a was selectively integrated on the versioned paused maintenance bridge4c94362c. App/lib/components have zero diff from1efac76a. Public intake now has no direct AI fallback; its shared helper durably queues during maintenance and returns truthful enqueue failure. The older readiness notes below are historical; the executable operational procedure in [material-list-operational-rollout-2026-09-15.md](material-list-operational-rollout-2026-09-15.md) supersedes their unresolved intake/gate limitation.

Latest local verification:98 deterministic AI tests;12 executable mocked gate/queue tests including explicit activated validation; cached Deno full3entrypoint check; combined network-none PostgreSQL restricted-role core6+actor+PAY+AI rehearsal134constraints/31triggers, both source/attachment lock orders and completedchunk retry PASS. SQLhash remains443d6d3672683e31672e93cd3f7ddd5215f3f356129154968ff008507477f633. No productionAI/provider call or deployment by this agent. Root owns realPDF62-row source proof and operational gate/drain execution. The current gate remains paused, not implicitly activated by deployment.

AI migration: `20260914180138_resumable_material_list_chunks.sql`, SHA256 `443d6d3672683e31672e93cd3f7ddd5215f3f356129154968ff008507477f633`.

## Reproduced and repaired

Actual combined core schema + six current core migrations + real durable-job table/claim/finalizer + AI migration reproduced a PostgreSQL 40P01: publisher holds job and waits source; real staff_apply_request_item_edit holds source and waits invalidation job. The earlier simplified edit-first test missed the reverse ordering.

Source invalidation now locks affected existing jobs in ID order NOWAIT before generation changes. Publication locks request/source/attachment rows NOWAIT before source revision validation or publication. 55P03 maps to safe database_retry. No source or checkpoint is changed when the transaction fails. A writer losing the lock race must explicitly retry; success is never falsely reported. This trigger-side fence also protects legacy durable claim/enqueue/finish paths that lock a job before source metadata updates.

An additional non-forced already_organized response previously could never finish because it deliberately has no publication checkpoint. The finalizer now validates this narrow no-op against locked existing organized rows; a forced attempt still requires a real published checkpoint. No fake checkpoint or provider call is introduced.

## Evidence

- Network-none disposable Postgres, metadata-only production baseline and synthetic records; no production SQL or provider calls.
- Six core migrations + actor helper + PAY: 134 constraints/31 triggers before AI; existing role/source/receipt/match and mixed A/B client/CAS/claim/bypass suites pass. Manager goals uses freshly captured production metadata (columns, constraints, policies, triggers and grants), not a permissive shell.
- Real permission baseline: service_role cannot SELECT auth.users or use private schema; authenticated cannot SELECT auth.users. AI concurrency RPCs execute under actual SET ROLE service_role, not merely a service JWT in a postgres session. Public AI RPCs are denied to anon/authenticated; no production privileges are changed.
- AI checkpoint + source-edit-first and publication-first pass, including failed edit source/generation rollback, checkpoint retention and explicit retry.
- Attachment-first and publication-first both pass: stale publication rejected, losing attachment insert rolled back, retry succeeds.
- Actual publication contention -> retry finalizer -> real claim with a new lease retains the completed chunk; resume needs no new provider call for that stored chunk.
- Non-forced existing-list no-op completes without fabricated checkpoint; forced bypass rejected.
- 98 deterministic Playwright tests pass (both configured projects; tests do not call a browser/provider).
- Fresh Next route typegen + full standalone TypeScript pass; targeted lint and diff-check pass.
- Full AI and worker Deno checks pass with `--cached-only --node-modules-dir=none`.
- Current 811-based webpack production build passed, including Next TypeScript and all 153 routes. Initial default Turbopack attempt failed because this local worktree reuses dependencies through an external symlink; successful rerun uses the established webpack release path.
- All 16 queued-only/release-guard executable mocked tests passed; no hook, worker or provider was actually called. Local rehearsal container was stopped and removed after verification.

Rehearsal command:
`node tests/ai-request-migrations-combined.local.mjs supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql d9521be0ca183572c1f43d50ecb6a5384df52216f35543dcca81cef8a10071ee`
Requires the specifically named local container `avantia-ai-current-20260915`, network none. Harness creates and drops only its own generated disposable database; extensions/Vault/cron/network dispatch are deliberately excluded. No production credentials are used. Capture of manager-goals catalog/role metadata was read-only on the confirmed production ref; no business records were queried or changed.

## Root-only coordinated maintenance/drain plan — not performed

1. Reconfirm website SHA/ref, actual AI/worker versions, current job states and all dispatch paths. Existing worker can be nudged by app as well as cron; cron pause alone is insufficient.
   Exact paths: lib/material-request-organization.ts -> requester enqueue RPC -> after-response worker; public-quote-intake/index.ts queueClientMaterialList -> service enqueue RPC -> worker OR direct AI fallback; scheduled dispatch_client_material_list_jobs() -> worker; worker -> AI. The public-intake Edge still invokes direct AI on enqueue HTTP failure at line246 and its catch at line257. The website queued-only backport does NOT remove that separate fallback. It must be gated or separately repaired before a drain can be called comprehensive.
2. Publish the independently tested queued-only app/helper behavior first, so enqueue failure cannot invoke old AI directly. Keep job creation durable; do not retry an existing real failed job.
3. In an explicitly approved maintenance window, gate BOTH worker claim and direct AI entrypoints before paid work. A temporary worker-only gate is not enough if old app/function invocations remain. Retain queued jobs/checkpoints; do not reset generations or mark active jobs completed.
4. Drain old invocations using observed Edge activity and the platform's verified maximum lifetime, not merely the worker's 120-second client abort timer. Confirm no old extraction/publication/finalizer remains in flight. A replacement deployment does not prove old isolates have ended. If this cannot be proved, hold migration/restart rather than guessing.
5. Apply exact reviewed AI migration; deploy matching AI and worker while dispatch remains gated; verify service-only RPC signatures and lease-required AI rejection using no-provider checks. Do not deploy old worker code after lease activation.
6. Restore controlled dispatch only after root explicitly approves pending real jobs that might invoke paid extraction. Resume completed generation checkpoints; complete checkpoint results skip provider invocation. A provider result that failed to persist before a crash is not an exactly-once provider guarantee.
7. Run a separately authorized supervised source extraction and reconcile each source row before claiming real-document success. Root is sole publisher; no maintenance switch or production mutation is included in this candidate.

## Still not proven

This is a safeguard/reliability candidate, not proof all 62 source rows extract correctly. Physical PDF cross-chunk continuation/section ownership, different scans of the same evidence, and real provider quality remain the documented continuity limitations. No automatic order, supplier/client message, financial action or existing request retry is authorized by these tests. A safe operational drain must be approved before deployment.

For the supervised 62-row source proof: record immutable original PDF/file hash and ordered page manifest first; reconcile source row numbers1–62 to exactly one extracted row each (zero missing/duplicates), original quantity/unit/specification/section and evidence page; retain HOLD/provisional/conflicting values as review-required. Inspect the page3/4 boundary and section headings independently rather than equating JSON occurrence IDs with physical rows. Interrupt/resume one controlled generation and verify its previously stored chunks and employee-reviewed/routed/priced data survive. Recheck the original file/source hashes and absence of supplier/client sends/orders afterward. Provider invocation and review of that real source require root's separate approval; no such proof was performed here.

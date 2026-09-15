# AI package integrated rehearsal and release gates

Base b671a247; selectively integrated 4be39d00/dca51819/63c0bff6 as cf870d98/aae89404/c7f65540. Shared request action adds only truthful failed-enqueue reporting; queued-only helper removes the unsafe unleased direct fallback. Core Step1/2/3, source receipts/CAS, mixed-route/client-send work remains in ancestry.

AI migration: `20260914180138_resumable_material_list_chunks.sql`, SHA256 `443d6d3672683e31672e93cd3f7ddd5215f3f356129154968ff008507477f633`.

## Reproduced and repaired

Actual combined core schema + six current core migrations + real durable-job table/claim/finalizer + AI migration reproduced a PostgreSQL 40P01: publisher holds job and waits source; real staff_apply_request_item_edit holds source and waits invalidation job. The earlier simplified edit-first test missed the reverse ordering.

Source invalidation now locks affected existing jobs in ID order NOWAIT before generation changes. Publication locks request/source/attachment rows NOWAIT before source revision validation or publication. 55P03 maps to safe database_retry. No source or checkpoint is changed when the transaction fails. A writer losing the lock race must explicitly retry; success is never falsely reported. This trigger-side fence also protects legacy durable claim/enqueue/finish paths that lock a job before source metadata updates.

An additional non-forced already_organized response previously could never finish because it deliberately has no publication checkpoint. The finalizer now validates this narrow no-op against locked existing organized rows; a forced attempt still requires a real published checkpoint. No fake checkpoint or provider call is introduced.

## Evidence

- Network-none disposable Postgres, metadata-only production baseline and synthetic records; no production SQL or provider calls.
- Six core migrations: 129 constraints/28 triggers, existing role/source/receipt/match and mixed A/B client/CAS/claim/bypass suites pass before AI install.
- AI checkpoint + source-edit-first and publication-first pass, including failed edit source/generation rollback, checkpoint retention and explicit retry.
- Attachment-first and publication-first both pass: stale publication rejected, losing attachment insert rolled back, retry succeeds.
- Actual publication contention -> retry finalizer -> real claim with a new lease retains the completed chunk; resume needs no new provider call for that stored chunk.
- Non-forced existing-list no-op completes without fabricated checkpoint; forced bypass rejected.
- 98 deterministic Playwright tests pass (both configured projects; tests do not call a browser/provider).
- Fresh Next route typegen + full standalone TypeScript pass; targeted lint and diff-check pass.
- Full AI and worker Deno checks pass with `--cached-only --node-modules-dir=none`.
- Integrated webpack production build passes, including Next TypeScript and all 153 routes.

Rehearsal command:
`node tests/ai-request-migrations-combined.local.mjs supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql d9521be0ca183572c1f43d50ecb6a5384df52216f35543dcca81cef8a10071ee`
Requires the specifically named local container `avantia-ai-combined-20260915`, network none. Harness creates and drops only its own generated disposable database; extensions/Vault/cron/network dispatch are deliberately excluded. No production credentials are used.

## Root-only coordinated maintenance/drain plan — not performed

1. Reconfirm website SHA/ref, actual AI/worker versions, current job states and all dispatch paths. Existing worker can be nudged by app as well as cron; cron pause alone is insufficient.
2. Publish the independently tested queued-only app/helper behavior first, so enqueue failure cannot invoke old AI directly. Keep job creation durable; do not retry an existing real failed job.
3. In an explicitly approved maintenance window, gate BOTH worker claim and direct AI entrypoints before paid work. A temporary worker-only gate is not enough if old app/function invocations remain. Retain queued jobs/checkpoints; do not reset generations or mark active jobs completed.
4. Drain old invocations using observed Edge activity and the platform's verified maximum lifetime, not merely the worker's 120-second client abort timer. Confirm no old extraction/publication/finalizer remains in flight. A replacement deployment does not prove old isolates have ended. If this cannot be proved, hold migration/restart rather than guessing.
5. Apply exact reviewed AI migration; deploy matching AI and worker while dispatch remains gated; verify service-only RPC signatures and lease-required AI rejection using no-provider checks. Do not deploy old worker code after lease activation.
6. Restore controlled dispatch only after root explicitly approves pending real jobs that might invoke paid extraction. Resume completed generation checkpoints; complete checkpoint results skip provider invocation. A provider result that failed to persist before a crash is not an exactly-once provider guarantee.
7. Run a separately authorized supervised source extraction and reconcile each source row before claiming real-document success. Root is sole publisher; no maintenance switch or production mutation is included in this candidate.

## Still not proven

This is a safeguard/reliability candidate, not proof all 62 source rows extract correctly. Physical PDF cross-chunk continuation/section ownership, different scans of the same evidence, and real provider quality remain the documented continuity limitations. No automatic order, supplier/client message, financial action or existing request retry is authorized by these tests. A safe operational drain must be approved before deployment.

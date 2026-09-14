# AI-01 — request 638410 extraction diagnosis

## Exact target and authorization

- Request `08786a04-da3d-491b-bda6-c2f007fa0549`, public 638410, reference AB-3AC4E861, 367 W Park Ave roofing RFQ.
- Production verified through `https://avantiabuild.com/api/release`: website `58c5c654`, Supabase `nprfhspwdflpqlopydmp` at diagnosis start.
- Isolated branch/worktree: `codex/request-ai-extraction-20260914`, `/tmp/avantia-request-ai-extraction-20260914`.
- Production access remained read-only. Local code and disposable PostgreSQL fixture changes only; no job retry, paid AI call, production original-row edit, supplier/customer send, secret value read, Edge deployment or production database mutation.
- Root owns master context, queue, retry authorization and release coordination. Request-step UI/actions belong to `request_list_cleanup`; avoid overlapping those files.

## Confirmed evidence

1. Durable job 38 remains `failed`, generation 2, attempts 5, last error `organizer_http_503`, updated `2026-09-11 04:27:16.166657+00`.
2. The original item `09d9c205-ab1a-4946-a636-95a0dae95538` remains intact as `Construction quote request`, quantity 1 request, not organized. Its metadata records `openai_timeout` at `2026-09-11T04:11:40.179Z`, current AI status failed and generic `automatic_processing_failed` error. This proves at least one provider attempt timed out; it does not establish the cause of later HTTP503 responses.
3. Exactly one client attachment record: `367-west-park-rfq-with-plans-2026-09-11.pdf`, application/pdf, 1,192,853 bytes. Local preserved source has the same size, 15 pages, no encryption and readable text. First page visually inspected in `/tmp/ai01-rfq-first-page.png`.
4. PDF contains an explicit RFQ table with saved quantities marked HOLD plus architectural plans. HOLD figures are not approved purchase quantities; no remeasurement or quantity correction performed.
5. Live Edge versions fetched read-only: `client-material-list-ai` v23 (updated Sept11 03:08UTC), `client-material-list-worker` v3 (updated Sept11 02:56UTC). Both preserve safe failure-code support.
6. Existing Vault secret name `openai_supplier_quote_api_key` is present. Secret value was not retrieved or printed. Presence does not prove historical availability, provider billing, permissions or quota.
7. Multiple read-only SQL attempts intermittently fail with PostgreSQL SQLSTATE53300: remaining connection slots reserved for SUPERUSER. Another successful snapshot saw 45 connections. This confirms a current intermittent database connection-capacity issue, not a proof of the historical provider timeout or later gateway503 cause.

## Code findings and proposed remediation

- Current organizer sends all selected attachment evidence in one synchronous provider call with medium reasoning, 90-second budget and 8,000 output tokens. Worker has 120-second budget. A long mixed RFQ/plan document with 62 material rows can exceed the synchronous budget; exact source metadata already records one timeout.
- Queue retries repeat the entire generation rather than resuming a provider response or completed chunks. A durable resumable response/chunk design is the robust long-document direction; raising one timeout alone does not prove reliability and can duplicate paid work.
- The organizer performs Vault lookup before request validation and before checking whether organized rows already exist.
- Source request/item/attachment query errors are discarded, so service errors may become misleading 404s or missing attachment evidence. Explicit safe query-error handling should precede any AI request.
- Missing configuration and connection-capacity failures should be distinguished using safe codes instead of a generic503/timeout. Do not expose raw DB/provider messages or credentials to the browser.
- Candidate base is `47def3ad5f8643d1df6c1a87a4d960fbc5934a85`. Root must integrate with subsequent approved releases rather than deploy this older base directly.

## Implemented local candidate

- Split PDFs into bounded three-page chunks; process one missing chunk per durable worker claim. Preserve source filenames/page ranges and original-byte fingerprint. Images are individual chunks. Reject omitted/oversized/unsupported saved client files rather than quietly publish incomplete attachment coverage. Limits: 64 chunks, 300 output rows, existing 8-file/32MB total budget.
- Private service-only checkpoint table saves validated JSON, not PDF bytes or secrets. Completed chunks survive ordinary retry; no promise of exactly-once provider billing: a timed-out/in-flight chunk may be billed again. Source edits start a new generation and intentionally invalidate prior results.
- Each claim has a UUID lease, generation and baseline progress count. Stale leases cannot save, continue or finalize a new claim. Continuation refunds its queue attempt only after new persisted progress, once. Permanent configuration/document failures stop automatic retries; capacity/deadlock/provider failures retain bounded retry behavior.
- Source edits invalidate generation transactionally, not only in a later application enqueue. Publication rechecks a DB-derived source revision and locks existing rows before checking reference protections. All inserts, replacement of unprotected AI copies, source-status update and checkpoint publication happen in one transaction. SQL NULL/malformed/non-AI rows are rejected. Manual/routed/priced/comparison-linked/item-attachment-linked work and requests with supplier packages cannot be destructively replaced.
- HOLD/provisional/unverified source quantities remain review-required. Explicit RFQ rows versus plan-only evidence are distinguished in prompts; no automatic plan takeoff or approval of HOLD figures was added.
- Failed request/item/attachment/job queries no longer masquerade as missing requests or absent evidence. Safe failure codes distinguish DB capacity, retryable serialization/deadlock, source changes and protected existing work.
- Removed unleased direct-AI fallback after queue failure. Request action now reports a truthful retryable start failure. This is the only actions.ts change, outside the other agent's workflow section.

### Changed files

`supabase/functions/client-material-list-ai/{index.ts,chunk-plan.ts}`, `supabase/functions/client-material-list-worker/index.ts`, `supabase/functions/_shared/material-list-failure.ts`, migration `20260914180138_resumable_material_list_chunks.sql`, `lib/material-request-organization.ts`, one queue-failure guard in `app/owner/materials/requests/actions.ts`; regression specs and disposable SQL/concurrency fixtures under `tests/`; `deno.lock` pins resolved Edge dependencies including pdf-lib1.17.1.

## Verification / limitations

- Deno check for both Edge functions passed with `--node-modules-dir=none`; targeted ESLint passed. Full `npm run lint`: zero errors, 31 pre-existing unrelated warnings.
- `npm run build -- --webpack`: passed (153 static pages); only existing preferredRegion deprecation. Standalone `npx tsc --noEmit` passed after the one-line request-action guard.
- Material chunk/failure/durable/multi-attachment/normalization/intake/source/semantic test suite: **67 passed**. Source-string expectations were deliberately updated from direct insert/delete and unfenced RPCs to the new atomic publication contract, not removed.
- Real PostgreSQL17 fixture migration plus assertions passed on fresh isolated databases: duplicate result immutability, continuation replay/no-progress guard, expired lease finalization, source generation invalidation, incomplete/null/malformed publication rejection, original preservation, duplicate-free publication, linked comparison protection, service-only denial. Added FOR UPDATE protection was reapplied and assertions passed again.
- Two simultaneous PostgreSQL sessions verified publication starts while an original edit holds the transaction lock: edit commits, stale publication is rejected, original edit and status preserved. Disposable container `avantia-ai01-sql-20260914` has network disabled and no host ports; scripts cannot target production.
- Actual 15-page local source PDF split, saved in memory and reloaded as five valid three-page PDFs. Zero provider calls. Mocked interrupted extraction preserves 62 unique fixture rows and retries only the failed chunk.
- No browser layout changed, no authenticated production writes and no live extraction performed. Local fixture mocks and valid PDF chunks do **not** prove the model extracts all 62 actual rows correctly. A supervised approved retry and source-row comparison remains mandatory; rows crossing chunk boundaries need particular review. Source/edit lock contention may return a safe retryable database error, never a guarantee of zero transient failures.
- `git diff --check` passed. Reviewed all 16 changed/new files for regressions and secret patterns: no embedded provider keys, Supabase secret keys or private keys found. Production credentials were not read or copied into the candidate.

## Release contract — requires root approval

This is not a website-only fix: migration plus both Edge functions must be coordinated. Old workers do not send leases; new workers need the new RPCs. Root should serialize against in-flight jobs and verify the active Supabase target independently before any service changes. No production migration, Edge deploy, push or real job retry is authorized/performed by this agent. UI chunk-progress display and bounded checkpoint-history retention are follow-up work, not claimed complete. Do not enable uncontrolled retries or delete past checkpoints as part of this candidate.

## Required next evidence

- If available, historical Edge/provider logs for Sept11 04:11–04:27 to distinguish gateway/service503 from configuration absence. No logs connector is currently exposed in available Supabase tools.
- Reviewed resumability/storage contract before a robust multi-stage implementation and explicit approval before retrying the real paid AI job.
- Unit/source tests and mocked-provider timeout/retry/idempotency tests; final approved live retry with original/attachment preservation and HOLD quantities retained as review-required.

The screenshot is a truthful display of the old failed job, not evidence that a new attempt is currently running. Do not claim extraction fixed or completed from UI changes alone.

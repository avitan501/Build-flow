# AI frozen-candidate guard corrections — Maya

Base: frozen `4be39d00`; isolated branch `codex/ai-frozen-guard-fixes-20260914`. NOT released or integrated. Original frozen candidate remains intact.

## Reproduced before fixing

1. Disposable PostgreSQL16 publication replaced a row carrying `manually_reviewed_at`; new adversarial assertion failed with `manually reviewed product replaced`.
2. Merger tests returned one row instead of two for equal text from distinct chunks and distinct row occurrences.
3. Disposable PostgreSQL16 finalization accepted NULL generation under a valid active lease and completed the job; assertion failed with `null generation completed job`.

## Corrections

- Publication protects either `manually_reviewed_at` or `manually_edited_at`, alongside existing price/route/attachment/comparison/package guards. Conflicts preserve old products; no forced replacement.
- Chunk result flattening stamps a stable extraction occurrence (chunk ordinal + result-row ordinal), preserved in item metadata. Preserve-source merge requires identical occurrence and chunk, not just matching words. Same occurrence replay still deduplicates. This identifies extracted occurrences, NOT independently verified physical PDF coordinates; model omission or hallucination is not solved by stamping an ID.
- Finalizer rejects NULL/mismatched generation before changing the job or lease, rejects NULL success flag, and requires a published current-generation/source checkpoint before success. Valid published review-only outcome still finishes.

## Verification

- 52 targeted semantic, occurrence, chunk, normalization, failure and durable-worker tests passed.
- Existing SQL checkpoint replay/source/lease/atomicity/security assertions and new adversarial SQL passed against a fresh `fixed` database in dedicated network-none container `avantia-maya-ai-guard-20260914`. NULL/wrong-generation finalization preserves active lease; unpublished success denied; published review-only success allowed. All adversarial transactions roll back.
- Deno checks of AI and worker entrypoints passed using existing cached Deno binary with `--cached-only --node-modules-dir=none`; no paid provider requests. Plain `deno` was absent from PATH and initial cache invocation needed node_modules mode correction; no dependency changes.
- `git diff --check` clean. No Next/UI files changed in this correction. No production SQL, Edge deployment, model change, live AI invocation or source document changes.

## Still HOLD — separate release decision required

Three-page chunks lack verified reconciliation for a table row continuing across chunk boundaries. Real62-line RFQ source coverage remains unproven. Model extraction quality, actual timeout/retry path and live browser-to-database behavior are not certified. Keep this candidate out of the coordinated request UI release until independently reviewed and chunk-boundary ambiguity addressed. Do not claim AI100% or that the user's real document has been extracted.

The unshipped migration was edited in its isolated candidate; its hash therefore changes and any earlier manifest approval is invalid for this candidate. Root must re-audit the exact migration and preserve current production worker changes before any future coordinated AI/worker/DB release.

# AI chunk continuity audit — Noam — 2026-09-14

Candidate base: `dca5181919d761dfc47512533f640e035a4283c9`.
Worktree: `/tmp/avantia-ai-chunk-continuity-20260914`.
No production mutation, paid provider call, original-file edit or reviewed-row edit.

## Completed deterministic fix

Two uploaded copies of identical PDF/image bytes at different storage paths previously generated separate chunks. Occurrence-preserving merge correctly retained distinct chunks, but that meant a copied attachment duplicated the material list. Planning now claims each SHA-256 + media-type evidence identity once. This does **not** deduplicate equal material rows within a file or different files with different bytes. Every attachment remains downloaded, counted against safety limits and included in the source fingerprint. Fingerprint version 2 prevents reuse of incompatible version-1 checkpoints.

Verified: 24 focused tests passed (evidence copies, source occurrences, chunk planning/resumption, semantic merge, durable-processing contracts); `git diff --check` passed. A synthetic 62-row repeated-text/HOLD fixture remains 62 rows across two chunks; duplicate entire attachment evidence is skipped; replayed source occurrence does not duplicate; HOLD remains review-required. This is deterministic fixture evidence, **not** actual-provider PDF accuracy evidence.

The initial test invocation unnecessarily attempted the default Next dev server and failed on the existing external node_modules symlink. Reran these pure tests with web-server startup disabled; no application server is needed or running for this task.

## Real source inspection

Read-only `pdfinfo` and `pdftotext -f 3 -l 4 -layout` of `/root/buildflow-supply/deliverables/367-west-park-rfq-with-plans-2026-09-11.pdf`: 15 pages; numbered RFQ rows 1–62 occupy the first four pages. Page 3 ends with row 52, page 4 begins row 53. This particular boundary does **not** demonstrate a split material row. Its original timeout/extraction failure is not diagnosed by this finding.

## Still open — do not call AI extraction fully verified

- Nonoverlapping three-page packets omit neighboring context. A row/specification or section heading spanning a packet boundary can still be interpreted incompletely. Current schema has no independently verified source-page/span ownership or reconciliation. A prompt alone cannot guarantee continuity.
- Different scans/exports of the same document have different bytes and remain separate evidence. Do not collapse them based only on similar item wording: that would erase real repeated floor/delivery quantities.
- Need provider-backed extraction and source-by-source reconciliation of all 62 actual rows, section/HOLD flags, quantities and reviewed-row protection under interrupted/resumed publication. No provider calls were authorized for this audit.
- A future overlap design must retain owned-page provenance, reject ambiguous boundary fragments for review, and avoid emitting context-only rows twice. Merely overlapping pages without ownership would reintroduce duplicates.

Shared request UI, source publication SQL and existing manually-reviewed preservation guards were not changed. Integrate this narrow commit atop the coordinated candidate; do not deploy this older AI worktree wholesale.

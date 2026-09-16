# Step 2 saved-list refresh — 2026-09-16

Quantity-first editing follow-up: user requested quantity before product, consistent with incoming messages. Clean/copy/matrix lines already quantity-first. Reordered spreadsheet controls to Quantity + Unit, Product, Width/Depth, Length/Model. DOM and keyboard order now match visual order; no CSS-only reorder. Added actual React browser regression asserting control order; persistence/recognition/undo/source ordering unchanged. Publication/live verification pending.

Additive follow-up: duplicate clean dimensions/model, line numbering and bottom item count. The formatter suppresses only explicit dimensions already represented by name (retaining measurement units), model/length already contained in name, and identical detail components. Distinct models, conflicting units, grade/coating/packaging remain. Shared formatter applies to displayed drafts, saved copy and current Step2 projection; no AI rerun or stored item edit. Spreadsheet numbers all rows in current source order; footer counts material rows and identifies new unsaved rows separately, never adds incompatible quantities. 22 targeted tests pass, including real React quantity-first/recognition/Save/Undo/add/remove/reload and full actual39-original association/order fixture. Full build/live publication pending at checkpoint.

Objective: display current saved Step 1 materials in the existing supplier comparison, retaining all received quotes and financial history. No bulk AI recognition or supplier reimport.

Implementation: `lib/current-request-comparison.ts` projects active source materials onto stable comparison IDs. Draft/review matrices read current names, quantities and specifications, with the same address-free clean lines used by Step 1. Supplier-derived historical rows are not current requested materials. Missing comparison IDs are reported, never associated by similar names. Sent/accepted/awarded/active-route snapshots are unchanged.

Files: comparison detail page, owner request page, comparison workspace and received product price matrix, plus helper and `tests/current-request-comparison.spec.ts`.

Verified locally: production webpack build (153 routes), TypeScript and targeted lint pass; 17 targeted tests pass, two unavailable private-fixture tests skip. Matrix renders four supplier columns at 1440/390 widths without document overflow. Tests cover stable IDs, no input/history mutation, clean lines, fresh saved edits, missing rows and duplicate-source warnings.

Production baseline: comparison `c8984e52-2b0a-4a65-bf34-ed98109fc432`, request `ffbbe612-c9a2-447f-9901-0dde51333132`; 78 stored comparison rows, 39 historical supplier-derived rows, four received quotes. Comparison-price digest `e1d726f9b74bcfd81d1cd5a3a6152e30`. This release performs no database mutation. Existing prices, approvals, choices, authoritative fingerprints and route contracts remain intact.

Scope limitation: financial draft cards and route calculations retain authoritative stored rows. This refresh does not certify every match, reconcile historical financial rows, or approve substitutions. Genuine material/quantity/unit differences remain reviewable. A supplier price tied only to a historical row is retained in storage, not silently reassigned. Full financial/provenance reconciliation remains separate work.

Attachment provenance: `material_request_five_towns_builders.pdf` is client-classified, created 2026-09-08 17:00:38 UTC. Certified and tPrusea attachments are supplier-classified. Five Towns is the customer name, not a repetition count.

Publication and authenticated live verification pending at this checkpoint.

Matrix refresh LIVE: commit `c6bfee1ca9b3e3d2ef7d57a546d48f7eb224d69a`, official workflow `35152335366` SUCCESS / job `104983428748` all 15 steps; Vercel `dpl_3YZBLBw58XS9onkTq4nFaKctrgH2` READY production exact SHA. Canonical `/api/release` confirms exact SHA and production `nprfhspwdflpqlopydmp`. Authenticated existing 9222 Chrome read-only live check: 39 rows, four supplier columns, 120 priced cells, exact clean-line equality with current Step 1, address-free, desktop/390 phone no document overflow. Temporary tab closed. Screenshot `/tmp/avantia-step2-refreshed-live-desktop.png`.

## Additive original-line/order correction

User requires verbatim original source lines and the same order throughout Step 1 and Step 2. Root cause: historical `source_text` contains reformatted AI snippets; all organized rows share a timestamp. `source_occurrence` is AI chunk/row order, NOT an original document line number.

New `lib/request-original-lines.ts` validates source-backed associations using original saved request text, harmless formatting normalization and explicit floor/section for duplicate lines. It returns the untouched original line. Ambiguities/changed specifications are not guessed. Current products and focused/spreadsheet/supplier views share the source ordering, without changing IDs or persisted economic data. Original source is separate from editable recognition text.

Actual private Framing fixture: all 39 rows resolve to the 39 verbatim original numeric material lines in exactly the same order. 21 targeted tests pass, two unavailable older private fixtures skip. Source association does not certify supplier equivalence or approve the stored item interpretation. Non-matching original associations visibly require verification. This correction requires its own serialized release after the matrix refresh completes.

Additional editor/action/recognition regression: 14 tests pass; final TypeScript/lint and 153-route webpack build pass. Explicit unit contradictions and reordered numerical roles cannot establish a source association. No AI calls, SQL writes, migrations, prices/approvals/routes/messages or credentials changed. Original/order correction publication pending at this checkpoint.

Original/order correction LIVE: commit `45e10b7b450fe211e3b217daaccf572713a07f1d`, official workflow `35153097188` SUCCESS / job `104985977969` 15 steps, Vercel `dpl_GeggpWPqwxCzJNp1JzuhXTyCJqz5` READY production exact SHA; canonical `/api/release` exact SHA/production/npr. Authenticated 9222 Chrome read-only check: all 39 displayed original source lines equal the saved original text verbatim and in exact original order; Step 2 clean requested lines equal the saved Step 1 lines in that same order; four supplier columns, 120 priced cells, address-free, desktop and 390 phone no document overflow. Temporary tab closed. Screenshot `/tmp/avantia-original-source-ordered-live-desktop.png`. Production price digest remains unchanged, 78 historical comparison records/four quotes retained. All live checks perform no business write or paid recognition. This completes source/order and read-only matrix refresh, not the separate supplier equivalence/financial reconciliation work.

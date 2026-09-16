# Step 2 saved-list refresh — 2026-09-16

Objective: display current saved Step 1 materials in the existing supplier comparison, retaining all received quotes and financial history. No bulk AI recognition or supplier reimport.

Implementation: `lib/current-request-comparison.ts` projects active source materials onto stable comparison IDs. Draft/review matrices read current names, quantities and specifications, with the same address-free clean lines used by Step 1. Supplier-derived historical rows are not current requested materials. Missing comparison IDs are reported, never associated by similar names. Sent/accepted/awarded/active-route snapshots are unchanged.

Files: comparison detail page, owner request page, comparison workspace and received product price matrix, plus helper and `tests/current-request-comparison.spec.ts`.

Verified locally: production webpack build (153 routes), TypeScript and targeted lint pass; 17 targeted tests pass, two unavailable private-fixture tests skip. Matrix renders four supplier columns at 1440/390 widths without document overflow. Tests cover stable IDs, no input/history mutation, clean lines, fresh saved edits, missing rows and duplicate-source warnings.

Production baseline: comparison `c8984e52-2b0a-4a65-bf34-ed98109fc432`, request `ffbbe612-c9a2-447f-9901-0dde51333132`; 78 stored comparison rows, 39 historical supplier-derived rows, four received quotes. Comparison-price digest `e1d726f9b74bcfd81d1cd5a3a6152e30`. This release performs no database mutation. Existing prices, approvals, choices, authoritative fingerprints and route contracts remain intact.

Scope limitation: financial draft cards and route calculations retain authoritative stored rows. This refresh does not certify every match, reconcile historical financial rows, or approve substitutions. Genuine material/quantity/unit differences remain reviewable. A supplier price tied only to a historical row is retained in storage, not silently reassigned. Full financial/provenance reconciliation remains separate work.

Attachment provenance: `material_request_five_towns_builders.pdf` is client-classified, created 2026-09-08 17:00:38 UTC. Certified and tPrusea attachments are supplier-classified. Five Towns is the customer name, not a repetition count.

Publication and authenticated live verification pending at this checkpoint.

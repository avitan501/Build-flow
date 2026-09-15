# Supplier quote autosave: implementation boundary (not shipped)

Read-only audit against `32279e23`; no supplier feature code or production writes.

The workspace currently stores editable quantities and fees as numbers and explicitly saves via `saveSupplierQuoteAction`. Debouncing this action is unsafe: it marks selected rows ready, coerces incomplete numeric text, and updates items/header in separate requests without revision CAS.

`app/admin/supplier-quotes/actions.ts` owns assignment/create (132/154), Save (891), delete (1024), extraction (1041), add (1187), catalog materialization (1219), and comparison/client materialization (1365/1906/1913). Routing reads mutable source and writes comparison, bid, prices, source links, and request progress sequentially. The local variable `claimed` at 1769 only recovers legacy bid ownership; it is not a reusable operation claim. The mixed client quote Send claim is a different domain.

Smallest safe full feature requires:

1. Shared raw-string draft, source snapshot and revision CAS, separate from financial/review-ready data.
2. Atomic explicit semantic commit that validates and returns an immutable committed revision/snapshot; blank or invalid text must never become zero.
3. Downstream catalog/comparison/client actions consume that acknowledged snapshot with idempotent operation results. Add/delete/assignment/extraction must invalidate or advance the baseline atomically. Old callers/direct writes cannot bypass the fence.
4. Concurrent database tests and actual React tests for failed saves, reloads, incomplete input, competing staff edits, extraction, routing, and interrupted materialization.

A separate preflight does not fence later reads or prevent partial downstream writes. Rejecting a late source update can leave earlier financial writes. Disabling routing/AI whenever a draft exists would break the approved workflow and is not an acceptable shortcut.

This is a dedicated multi-action release, not a small final autosave patch. Keep the existing explicit Save workflow until the complete mutation contract is reviewed. Universal autosave is not complete; no deadline or production status is claimed here.

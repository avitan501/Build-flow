# Planner benefit and scrolling update — 2026-09-23

David requested three new benefits, persistent table headings, and one subcontractor/material-cost column. Prepared on isolated branch `codex/planner-benefits-sticky-20260923`, worktree `/root/avantia-planner-benefits-20260923`, based on verified production `8105aa7b`.

Changes:
- Added: One payment to Avantia. We pay your suppliers; Store doesn’t deliver? We arrange delivery; Urgent material needs? We help source them.
- Table has a bounded vertical/horizontal scroll area, sticky headings and frozen department cells. Keyboard focusable scroll region; textareas refit when viewport changes.
- Six visible service columns. `Subcontractor check` explains “What’s included & estimated material cost.” Removed separate Material Cost Review column and fee field from the layout/customer preview.
- Seven existing service/fee storage slots retained for compatibility. Combined check is true if either old check is true, indeterminate if neither is true but one unknown. Explicit toggling sets both old slots to the new selection. Unrelated edits preserve original slots. Earlier fee is reused if the main fee was blank; a distinct legacy fee is shown as a note rather than discarded. New edits to the combined fee replace that legacy note; normal version history preserves earlier saves.
- No database migration, state replacement, payment processing or delivery workflow changes.

Read-only live source: revision6, Plans items “Blueprints, designer plans, survey Printing ”, Plans legacy material-cost checkbox true; all fees blank. Server reads latest database state each time; no seed overwrite. This provides evidence that David’s saves have reached the live database, though our own authenticated live save/reload test remains pending owner login.

Validation: 8 planner browser tests across Chromium/mobile WebKit; 3 API/store security and conflict tests; changed-test lint/diff checks. Final production webpack build and TypeScript passed after the generated-source update; log `/tmp/avantia-planner-benefits-final-build.log`. Screenshots inspected; current customer print preview is one Letter landscape page.

Publication: not pushed or deployed. GitHub workflow rechecked and remains `disabled_manually`. Earlier explicit alternate-hook permission said “this one deployment” and was consumed by the initial release. This update needs explicit permission for the same existing main hook before publication. Codex is designated publisher; current production remains `8105aa7b`. Preserve any new user edits; no production business writes or outgoing messages have been made.

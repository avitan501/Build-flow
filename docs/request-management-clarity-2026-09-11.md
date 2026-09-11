# Request management clarity — 2026-09-11

Objective: make the existing three-step staff request flow understandable to a new employee without adding more copy or changing business actions.

Scope: isolated branch `codex/request-management-clarity-20260911`, based on production website `9ce50cdd`. Only the management panel and its scoped regression tests are changed.

- Completed Step 2 now opens, focuses and scrolls to the existing Step 3; it no longer opens a new estimate regardless of the client's actual progress.
- Both management steps have stable, keyboard-focusable destinations and scroll clearance for sticky navigation. Reduced-motion preference is respected.
- An upcoming Step 3 says to finish supplier pricing first. Completed payment/receipt/scheduling says `Payment complete · Delivery scheduled`, not a claim that physical delivery occurred.
- No status derivation, backend, messages, prices, payment proof or document actions changed.

Verification: 12 scoped static/workflow tests passed, scoped ESLint passed, whitespace check passed. These tests do not launch browsers or prove live UI behavior. Integration build and existing-Chrome phone/desktop checks belong to the primary integration task. No production deployment or external business-data mutation.

Audit followups outside this bounded change: align four-stage desktop header with three workflow cards; avoid global manual substep status contradicting evidence-based next action; clarify manual supplier names without contact records; distinguish actual delivered proof from scheduling; shared end-to-end guide is owned by primary agent. Preserve the separate organizer hotfix commits before any organizer redeployment.

## Screenshot follow-up: known thickness and missing-only autosave

Root cause: review recommendations offered every material-type field, and the editor replaced exact saved values not matching a preset (for example `5/8` versus `5/8 in.`) with its default `1/2 in.`. Saving sheet size could therefore overwrite known thickness.

The review editor now asks only missing fields, recognizes both saved metadata and structured fields without coercing their exact values, starts with an empty `Choose…`, and saves only a deliberate selection. There is no Apply button, inferred 4x8 selection, or mount-triggered save. Pending choices are locked; failures preserve the chosen value with Retry. General grade, match and other uncertain requirements remain for the full Details editor, not silently approved.

Dedicated `saveMaterialReviewChoiceAction` reads the current staff/request-scoped row, validates the chosen missing field and allowed value, and changes only metadata plus qualification status. It preserves name, quantity, unit, supplier routing and other specifications. Original-metadata equality prevents this action overwriting a changed metadata snapshot, with zero updated rows treated as a failure. This is a narrow guard, not a claim of sitewide concurrency protection. Existing full manual editor/action is unchanged; no migration required.

Verification: 15 tests passed, including pure helper behavior, mocked real-action execution for success/failure/unauthorized paths, and Supabase SDK filter serialization using a mocked fetch (no database call). Scoped ESLint/whitespace passed. Standalone TypeScript initially found one test inference issue, fixed; this isolated tree still lacks generated Next `RouteContext`, so primary integration build is required. No production writes/deployment or physical-browser tests performed by this subtask. Primary owns phone/desktop integrated autosave verification. Source guidance: official Supabase JavaScript filtering/update docs and skill security checklist; frontend guidance kept minimal UI and explicit intent.

# Request management clarity — 2026-09-11

Objective: make the existing three-step staff request flow understandable to a new employee without adding more copy or changing business actions.

Scope: isolated branch `codex/request-management-clarity-20260911`, based on production website `9ce50cdd`. Only the management panel and its scoped regression tests are changed.

- Completed Step 2 now opens, focuses and scrolls to the existing Step 3; it no longer opens a new estimate regardless of the client's actual progress.
- Both management steps have stable, keyboard-focusable destinations and scroll clearance for sticky navigation. Reduced-motion preference is respected.
- An upcoming Step 3 says to finish supplier pricing first. Completed payment/receipt/scheduling says `Payment complete · Delivery scheduled`, not a claim that physical delivery occurred.
- No status derivation, backend, messages, prices, payment proof or document actions changed.

Verification: 12 scoped static/workflow tests passed, scoped ESLint passed, whitespace check passed. These tests do not launch browsers or prove live UI behavior. Integration build and existing-Chrome phone/desktop checks belong to the primary integration task. No production deployment or external business-data mutation.

Audit followups outside this bounded change: align four-stage desktop header with three workflow cards; avoid global manual substep status contradicting evidence-based next action; clarify manual supplier names without contact records; distinguish actual delivered proof from scheduling; shared end-to-end guide is owned by primary agent. Preserve the separate organizer hotfix commits before any organizer redeployment.

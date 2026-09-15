# Framing quote upload audit

Scope: Five towns builders Framing #638408; user will upload the PDF.
No duplicate upload, supplier outreach, order, substitution approval or existing
business record mutation has been performed by this task.

Base: production 70e4aec545b5651424d1eda00ec7d3d833df0d8b.
Isolated branch/worktree: codex/framing-quote-audit-20260915,
/tmp/avantia-framing-quote-audit-20260915.

## Verified source and fixes

Builders FirstSource quote 90164873, two pages, 29 priced rows,
subtotal $51,742.11, tax $4,527.44, total $56,269.55.
Original unpdf text processed by old fallback produced 25 rows/$33,601.51,
discarding high-quantity rows and one identical line on another floor.
The corrected parser produces 29 rows/5,174,211 cents from the actual PDF.
All five LF rows retain printed quantities, prices, floors and cut lists.

- Support quantity/SKU/description/UOM/price/total column order.
- Preserve repeated printed rows, including identical rows on different floors.
- Keep labeled floor sections and explicit cut lists without converting LF to EA.
- Reject automatic cross-floor matches even when the SKU matches.
- Read unique arithmetically reconciled subtotal/tax/total grid values.
- Warn when AI returns fewer rows than text parsing or totals fail to reconcile.
  Warnings do not certify complete extraction, approve equivalence or change prices.

## Tests and outstanding verification

22 targeted parser/pricing/matching flow tests pass across the two Playwright
projects (these are logic tests, not live browser upload tests).
Broader storage suite: 21 passed, 2 failed; the same two static source-string
assertions also fail on unchanged production base (old Step 1/2 UI copy checks).
Webpack production build passes (153 routes). Initial typecheck needed generated
Next RouteContext; post-build typecheck performed separately before publication.

Publication and live upload verification are not yet complete.
Must inspect actual user-uploaded attachment, AI output, mapping and persistence
on #638408. Do not replace the user's existing reviewed lines to run this test.
AI may legitimately differ from fallback; compare source evidence before deciding.
PWI/PWT versus TJI and dimensional/material alternatives require owner review.
Continuation descriptions beyond explicit cut lists still require AI/source review.

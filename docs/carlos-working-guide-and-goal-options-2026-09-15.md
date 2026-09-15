# Carlos work guide and proposed selectable goals

## Implemented work guide

`components/buildflow/carlos-working-together.tsx` renders a collapsed, keyboard-accessible “Working together / Your work guide” disclosure immediately below the Time Log & Daily Summary header. Two groups contain all 13 owner-requested guidelines in friendly English. Existing page remains `/admin/daily-summary`.

Schedule uses existing New York timezone: 9 AM–2:30 PM with a 30-minute break; later work only when David requests. Biweekly bank payment is explanatory copy only. No automatic payroll transfer, time adjustment, disciplinary action, agreement acceptance, or new permissions. Quotes and contact with David-introduced suppliers explicitly require David’s approval first.

Local verification: webpack production build 153 routes, scoped ESLint; six Chromium/WebKit checks verify all 13 rules, collapsed default, keyboard open/close, actual 390/1440 layout widths and preserved payroll permission wiring. Initial fixture JSX transform issue fixed by compiling the real component with the React runtime; mobile fixture viewport corrected before final passing run. Screenshots `/tmp/carlos-working-together-{390,1440}.png` visually inspected at 390. Publication/post-release evidence belongs in master context.

## New user request — proposed goals, NOT implemented

User asks for ten meaningful options from which Carlos can choose five and describe what he achieved. This is a proposal, not a restoration of the removed daily percentage scorecard and not a change to payroll.

| English goal | Concrete evidence of completion |
| --- | --- |
| Collect 5 supplier quotes | Five actual received quotes attached to their relevant requests, with supplier and priced items identified. This entire target is one of the five selected goals. |
| Send an approved client quote | David's approval, sent quote, recipient and agreed follow-up time. |
| Capture a new material request | Actual client request with product list, quantities, contact and known delivery needs. |
| Find a supplier for a missing product | Verified supplier, exact product, availability and contact details. David-introduced suppliers require approval before contact. |
| Complete a like-for-like comparison | A request's supplier offers matched by product/specification/unit/quantity, alternatives clearly marked. |
| Secure a better buying price | A documented improved offer against a comparable prior offer, with shipping/taxes and conditions accounted for; no purchase authorization implied. |
| Make an incomplete request ready for pricing | Missing specifications confirmed with the client and recorded, not guessed. |
| Move a stalled request forward | A specific blocker resolved and concrete next action/date agreed and recorded. |
| Confirm an approved delivery | Actual supplier/client agreement on delivery date, address and included items for an already approved order. |
| Resolve a website problem | Reproducible issue reported to David; fix verified through the affected flow and David updated. Reporting alone remains In progress/Blocked, not Done. |

Proposed each selected goal: In progress / Done / Blocked, short outcome note, related request/quote/contact link, follow-up or blocker when relevant. One outcome should not be counted twice; goals depend on real available work. No fake goals to fill five slots. Cadence and persistence design are not yet approved/implemented.

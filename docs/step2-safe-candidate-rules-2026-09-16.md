# Safe received quote candidates — 2026-09-16

User asked to fix orange matching issues and lower items by correcting rules, not hiding warnings. Scope: readonly received-source matrix candidates. No authoritative bid, price, approval, original attachment or economic draft mutation.

Changes in lib/received-product-prices.ts:
- Normalize 1ST/2ND/3RD floor labels before section comparison.
- Read supplier lumber forms 2X12X24 and 2x12-24 as dimension 2x12, length 24 feet. Reject explicit conflicting lengths.
- Remove routing-hint precedence that could override stronger length/quantity/section evidence. Rank all display candidates consistently; exact ties remain unresolved.
- Derive piece candidates only from explicit printed quantity/length schedules with positive, unique cuts, exactly reconciled LF quantity and price total. Each cut retains original source line and a distinct allocation key; a cut reused across request rows remains flagged. No cut schedule or failed reconciliation means no fabricated piece price.
- Preserve actual substitution, unit, quantity, mount and ambiguity checks and verified-only lowest-price gates. Candidate prices are not automatic equivalence or approvals.

Read-only production source fixture: four quotes, 145 source lines. KSJ lines1,15,16,28 reconcile to four/four/four/one cuts; line2 LVL has no printed cut schedule and remains original bulk LF data. Original lines unchanged. KSJ first-floor joist piece candidates: $68.80/$89.44/$55.04/$34.40, based on $3.44/LF and printed lengths20/26/16/10. NI60 versus TJI230 warning remains an actual alternative requiring approval. No assumption that different joist series are structurally interchangeable.

Local verification: 24 targeted tests PASS, two older unavailable private-fixture cases SKIP; actual current four-quote printed-cut fixture PASS. TSC/lint PASS; full153-route production build PASS before final finite-value guard, rerunning final candidate. One responsive test initially raced regenerated build CSS; rerun after build PASS. Exact release and authenticated actual39-row/four-column matrix including lower items still pending. Private fixtures in /tmp only, not committed. No AI calls, messages, SQL writes, migrations, credentials or automatic product approvals. Readonly authoritative price baseline unchanged: one row/digest e1d726f9b74bcfd81d1cd5a3a6152e30.

# Comparison cost acceptance and baseline basket

## Approved scope

Item-specific acceptance from the existing PDF/source review modal. Blue packaging uses the supplier's original full quoted line total without guessing pieces per box. Other comparable-unit quantity differences use requested quantity × source unit price. Acceptance is a costing decision, not engineering certification or ordering. Missing source prices stay missing. One original supplier line may be accepted once; no automatic splitting or duplicate quantity allocation.

## Implementation

Existing authenticated product-choice autosave/CAS saves optional matrix acceptances and calculation mode in existing JSONB. No migration or provider/configuration change. Server checks locked status, revision, bid/request/source fingerprints, membership, actual candidate availability, monetary basis and unique source allocation. Actor and timestamp for new acceptances are server-derived, not trusted from submitted data. Undo removes the current costing acceptance. Request/source changes invalidate restored acceptances. Other items sharing an accepted source stay excluded until a separate valid source is provided. Existing engineering and order finalization remain separate.

My selections uses the comparison supplier for unchanged rows, with saved per-item overrides. Cheapest mix remains the default suggestion mode. Basket spending by supplier is visible below the matrix; actual supplier-column totals remain separate. Before tax and delivery excluded. Missing or unresolved lines prevent a complete basket label; no fabricated zero prices.

Excluded supplier-footer items now have a focused list with source-review entry points, not another complete item list. Original wording, AI-organized line, source wording and uploaded PDF remain distinct.

## Verification

Initial 27 arithmetic/action tests passed after fixing packaging detection to include source reasons. Broader 109 passed / 2 older skipped. Focused 18 passed, including native consent/accept/undo and authenticated server audit stamping, forged source/duplicate allocation rejection. Final additional baseline-default test, final full webpack build, publication and actual live verification pending at report creation. No real material acceptance or source-price/allocation mutation performed in verification.

## Remaining business review

The application enables the owner's informed acceptance; it does not approve real differences automatically. Actual source absence, unresolved shared/combined source allocation, and existing stale AI request dimensions remain issues requiring source-backed correction or explicit item-level decisions. Production cannot be called a complete 39-item cost until all lines have a valid cost basis. The original-source 26-in/26-ft LVL legacy concern remains separate from this acceptance work.

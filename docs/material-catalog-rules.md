# Material catalog comparison rules

Reviewed 2026-09-17. Source wording remains unchanged. A naming alias does not approve structural performance, manufacturer, grade, treatment, mount, quantity, cutting availability or package conversion.

## Enabled: LVL nominal 10-inch depth → 9½-inch catalog depth

David explicitly approved this naming convention. Home Depot groups 1¾×9½-inch LVL in its nominal 10-inch category: https://www.homedepot.com/b/Lumber-Composites-Engineered-Lumber-LVL-Beams/10-in/N-5yc1vZbtmzZ1z1rl7b

Scope: LVL only, an unqualified nominal 10-inch depth. Explicit Actual dimensions and labeled width/thickness remain literal. 9¼ is NOT 9½; lengths and quantity remain independently checked. Implementation: lib/material-nominal-dimensions.ts, measurement-classification only. No financial approval or source-data rewrite.

## Enabled: sheet dimensions separate from thickness

`4×8 3/4" CDX` means sheet dimensions followed by thickness, not 8¾-inch thickness. Normalize notation without changing material grade or exposure rating. Genuine 5/8 versus 3/4 remains an issue.

## Reference only: dimensional lumber nominal versus actual

Home Depot documents 2×4 lumber as actual1½×3½: https://www.homedepot.com/p/310242094
Do not apply this dimensional-lumber rule to LVL, rough-sawn stock or treated products without a catalog/specification mapping.

## Reference only: plywood nominal versus actual thickness

Home Depot PureBond model5787 lists nominal3/4 and actual0.703: https://www.homedepot.com/p/317372919
This is SKU-specific interior hardwood plywood, NOT approval to equate every CDX/OSB/deck panel. Require a verified product specification before enabling an actual-thickness alias. Performance/exposure substitutions still need a decision.

## Adding rules safely

Record source URL, date, exact family/SKU, input and output dimensions, exclusions and positive/negative regression tests. No live scraping or paid AI call is required for known rules. Prefer manufacturer's specification for engineering properties. Missing source evidence remains visible; do not remove warnings through arbitrary numeric tolerances.

# Step2 product-first UI — isolated release candidate

Branch/worktree: `codex/step2-product-ux-20260914`, `/tmp/avantia-step2-product-ux-20260914`, based on live `8c79820c` independently verified through the active domain release endpoint.

## Implemented

- Compact, full-width requested product rows with complete product/specification/quantity text.
- Native accessible accordion group: only one product's supplier responses open at a time; keyboard activation works.
- Expanded offers retain recorded supplier wording, missing-source distinction, unsafe/mismatch exclusions, and every supplier response. Unit price is primary, product total secondary.
- Local draft choice is summarized on its product row; no automatic order/award/technical-equivalence claims.
- Small Add/edit quote and More controls. Existing pricing editor, match confirmation, route/client flows and draft-lowest computation remain available.
- Long draft disclaimer and supplier subtotals are collapsed. Important “not saved / no orders sent” remains visible.
- Frontend guidance applied as a minimal adaptation of the approved product accordion concept; no new package/schema/provider dependency.

## Verification

- 34 focused comparison/render/native-browser checks passed, including unknown/unavailable/review/zero-price cases.
- Two full local sample-route workflow checks passed at 390 and 1440: opening another product closes the first, selecting updates the product draft summary, Edit prices remains accessible, reload resets temporary selection truthfully, no horizontal overflow.
- All browser POSTs were blocked. No Next server action was invoked; pre-existing telemetry attempted POSTs were blocked too.
- Screens: `/tmp/step2-products-{closed,open}-{390,1440}.png` and isolated `/tmp/step2-product-accordion-{390,1440}.png`; phone screenshots visually inspected. These are local sample data, not live customer verification.
- Final webpack production build and TypeScript passed (153 routes). Full lint: zero errors, 31 existing warnings. Diff/secret review clean. No secrets, migrations, external messages, prices, orders or production changes.

## Important remaining boundary

The existing per-product choices are temporary browser state, not persisted. This UI must NOT say “saved automatically.” Existing saved bid prices/routes are preserved, and their existing actions remain unchanged. Dedicated autosave work is separate and must integrate without silently changing this claim.

Root/release owner must integrate, verify the authenticated current request page and deploy serially. Do not include frozen Step3/PART01 or incomplete PDF prototype merely because those tasks are nearby. PDF capture is separately preserved as WIP `354fc77a`; its incomplete SQL is outside migrations.

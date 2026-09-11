# Product comparison readability — September 11, 2026

## Scope and version

Isolated branch `codex/comparison-readability-20260911`, worktree `/tmp/avantia-comparison-readability-20260911`, based on production commit `0906a5ce2918b82da03d7908041295fca03ca3e2`.

Presentation-only changes to the product-first comparison. Each product shows the existing eligible lowest offer and any manually selected override. Secondary offers are in a native collapsed disclosure, with a review count. Full product specifications remain visible. Unknown quotes, unavailable items, blocked suppliers, and match-review exclusions remain distinct. Moving a selected radio into the prominent group restores focus to that radio.

The comparison helper, eligibility, price arithmetic, award/payment actions, persistence, and server actions are unchanged. The temporary/not-saved warning and material-only subtotal limitation remain visible. This does not implement autosave or final mixed-supplier award.

## Files

- `components/buildflow/product-quote-card.tsx`: stable module-level compact card and presentation-only offer grouping.
- `components/buildflow/quote-comparison-workspace.tsx`: compact heading and card integration.
- `tests/product-quote-card.spec.tsx`: grouping, immutable input, manual override, actual SSR markup, excluded offers, empty states, and draft-warning contracts.

## Verification

Focused Playwright runner tests (without browser fixtures): 11/11 passed across `product-quote-preview.spec.ts` and `product-quote-card.spec.tsx`. Actual React static rendering verifies native collapsed details, full specifications, and accessible/disabled radios. Existing helper tests cover cheapest-per-product, excluded/unknown/unavailable offers, manual override, invalid prices/quantities, and quote versions.

Targeted ESLint passed. `git diff --check` passed. Standalone `tsc --noEmit` reported only the existing missing generated `RouteContext` type in `app/admin/supplier-quotes/requests/[requestId]/chart/route.ts:8`; no errors in changed files. Parent integration owns the full build (including Next-generated types) and phone/desktop browser verification: this task deliberately did not use the shared Chrome while the primary agent was using it. Static/SSR tests are not visual verification.

No production mutations, deployment, API calls, messages, or external writes. No credentials or configuration changed. Primary agent should add the integrated commit, final build/browser results, deployment status, and remaining work to the master context.

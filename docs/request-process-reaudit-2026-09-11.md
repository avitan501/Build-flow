# Request process re-audit — 2026-09-11

Objective: recheck the request workflow against David's compact, clear, minimal-action concept; preserve already published fixes and existing commercial progress.

## Changes

- Integrated isolated agent commit d54bfc5a as cd8c0c51: comparison guidance no longer promises saving temporary per-product choices; a fresh upcoming Step 3 navigates to supplier pricing instead of offering the premature primary estimate action. Existing documents, fulfillment evidence, and explicit direct-estimate tools remain accessible.
- Added a contained route error boundary and shared readable error recovery. Installed Next 16.3.4 supports `retry`, which refreshes the route as well as resetting the boundary. The previous `reset` still exists, but clearing the boundary alone can replay the existing server error. Recovery is explicit; no automatic POST/action retry was added.
- Global error background/text remain readable independently of global CSS. Internal error details are not displayed. Sentry reporting retained.
- Added an accessible request loading state.

## Verification

- 77 focused regression tests passed, including new recovery rendering/callback tests, upcoming stage navigation, preserved documents/progress, material-review autosave, intake placeholders, supplier units, and comparison pricing eligibility.
- Seven release guards passed. Full production build/TypeScript passed (153 routes); existing preferredRegion deprecation warning remains. Targeted ESLint and diff whitespace checks passed.
- Existing noVNC Chrome only: rendered actual shared recovery component at 390 and 1440 px. No horizontal overflow, 44 px button, keyboard focus reachable. Screenshot `/tmp/avantia-recovery-390.png` visually reviewed; desktop `/tmp/avantia-recovery-1440.png`. This is component-layout verification, not a physical iPhone test or a complete Next server-error retry integration test.
- Read-only source review: no status/payment/authorization/save semantics changed. Added-line secret-pattern review required before commit. No outbound business messages, payment actions, database changes or restart.

## Still open / limitations

- Production data service remains intermittent: first read-only SELECT 1 succeeded, later request-job query timed out after 15 seconds. Normal Google sign-in reached the production Supabase authorize endpoint and displayed `upstream request timeout`. Existing staff session was not renewed. Do not claim authenticated end-to-end save/import/delivery verification.
- Existing Website Defects tab displays 1 open / 34 resolved, but its data could not be freshly reloaded through the blocked authentication flow. No defects marked resolved.
- AI request 638410, durable per-product mixed-supplier choices, whole-site autosave, quote reimport safety, and public-intake idempotency still need their separately scoped work. No speculative data repair/retry.
- No Supabase restart: availability impact requires an explicitly coordinated exact-target intervention. Project status alone does not prove healthy DB/auth.

## Release

Candidate based on live/canonical/mirror 01964b79, preserving all approved changes; isolated worktree `/tmp/avantia-request-clarity-20260911`. Production release pending serialized owner workflow; update this section after terminal result. Active domain only https://avantiabuild.com.

# Request clarity and screenshot fixes — 2026-09-11

## Scope and release boundary

David prioritized a short, readable request intake flow with minimal controls. Candidate branch `codex/request-clarity-20260911`, isolated worktree `/tmp/avantia-request-clarity-20260911`, starts from live website `9ce50cdd`. Only `https://avantiabuild.com` is in scope. This package is local, not deployed; a new release approval and authenticated verification remain required.

## Implemented

- Consistent three-step navigation, one next-action instruction, optional collapsed onboarding, and focusable destinations across the shared request detail page. No new data fetching or automatic outbound actions.
- Readable product identity: dimensions, length, thickness, model and floor/section; mobile tiny truncated chips removed.
- Known public quote intake envelopes are original source documents, not Ready products. Visible **Organize with AI** action replaces ambiguous **Split list** label. Completion and comparison filtering use the same placeholder rule. Original HOLD/unverified notes remain intact; no roofing request was reprocessed or approved in this task.
- Missing-detail editor asks only for missing fields, retains known thickness such as 5/8 inch, starts unknown choices blank, and autosaves an explicit choice. A failed save retains the selection and offers Retry. Server reads the current scoped row and uses a metadata compare-and-set guard; no broad metadata replacement from the browser.
- Step 2 completion opens the existing Step 3 instead of a new estimate. Delivery scheduled is not labeled delivered.
- Dashboard attendance stays in its own mobile row. Alerts grouped into delivery issues, unread messages and requests; unread does not imply a reply is owed. Failures remain visible; request alerts are no longer discarded by the combined eight-row cap. Per-query limits remain, and UI says “shown.”

Integrated commits: `e17bce07`, `83fc3520`, `db8c21fa`, `cc604297`, `764d7ced`. Previously deployed organizer hotfixes preserved as `e929d60b`, `e3260369`, `057dee18` (originals `7f1b3e26`, `30f477a6`, `ad03f69a`). Those Edge changes were already live before this task; they were not redeployed here.

## Verification

- 127 focused Playwright helper/static/action-mock regression tests passed, including original-line preservation, missing-only edits, step gates, raw envelopes and dashboard categories. These are not 127 authenticated browser journeys.
- Seven release-guard tests passed; changed-file ESLint, TypeScript before fixture removal, whitespace check and bounded added-line secret-pattern scan passed.
- Existing noVNC Chrome used via CDP, no new browser/context. Shared-component local fixture at 320/390/1440: three-step destinations/focus, readable TJI variants and no horizontal overflow. Images `/tmp/avantia-clarity-{320,390,1440}.png`.
- Missing-detail failure/retry tested with intercepted mock server-action responses at 390/1440: no thickness question, empty missing size initially, failed choice retained, successful retry retains 5/8. Images `/tmp/avantia-review-autosave-{390,1440}.png`. This does not prove real database persistence.
- Dashboard category DOM/layout checks passed at 320/390/1440 with all three links retained. Screenshot capture timed out twice; do not claim a new dashboard image was visually verified. Separate attendance screenshots verified by Noam.
- Temporary `app/clarity-check/page.tsx` removed. Initial build failed only because generated `.next/dev/types/validator.ts` still referenced the removed fixture. Development cache moved recoverably to `/tmp/avantia-clarity-dev-cache-20260911-removed-fixture`; clean `npm run build` passed including TypeScript and all 153 generated pages. Existing preferredRegion deprecation warning remains.
- Live staff request and Website Defects pages redirect to login. Actual staff end-to-end flow, missing-field DB persistence and defect closure remain unverified.

## Explicitly remaining, not “done”

1. Authenticated real intake → AI → supplier assignment → quote comparison verification, then owner-approved production publishing. Never treat local mocked checks as live proof.
2. Supplier pricing safety draft: same-source partial reimport preserving untouched rows, stale approval bound to reviewed specifications, and downstream alternative confirmation. Separate box/each/pack unit guard `e43fa760` on baseline `abce5876` in `/tmp/avantia-supplier-unit-guard-20260911` passes 16 tests but requires caller unit plumbing and is not integrated or released; this does not complete the whole pipeline.
3. Sitewide autosave: candidate `137ffe5a` is not released. Client save/send atomicity and incomplete drafts remain unresolved; comparison draft migration and save/reload/conflict checks pending. Mixed per-product selection is still a draft, not final mixed-supplier award.
4. Supplier OCR model upgrade not deployed: live supplier parser remains gpt-5-mini. Existing-key reuse already approved; do not resurrect the obsolete credential gate.
5. Google Meet permanent room not live. Existing Google tabs show account chooser/session expired. David must resume organizer-account login and any verification in existing noVNC; room/access/co-host setup and binding remain.
6. Five recorded SMS undelivered events remain genuine unresolved failures. Synced envelopes do not contain provider cause; no automatic resend or outbound contact occurred.

Homepage/notification categorization (`46a61006`) and navigation (`a3bdbfbc`) already exist in live `9ce50cdd`; do not repeat or list them as wholly undeployed. No production database writes, messages, Meet creation, settings changes, deployment or defect-ticket edits occurred in this task.

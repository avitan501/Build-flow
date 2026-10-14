# Avantia dashboard v5 integration

Date: 2026-10-14. Owner and sole publisher: Codex. User authorized implementation, real unfinished business-task additions, a delete-task option, and production release.

## Scope and source

- Worktree: `/root/avantia-dashboard-v5-20261014`; branch: `codex/dashboard-v5-20261014`.
- Base: `94606f2db789aa9b9c2a927d7f65bb6d54f2d127`, verified live and on both required main branches before implementation.
- Approved template: `350f71edab9e669e3dd4cd1372b103f430513fab`, latest revision of `/root/buildflow-supply/output/dashboard-character-preview-20261013/dist/HANDOFF.md`.
- Destination: `https://avantiabuild.com/admin/goals-progress/website-work`, the existing owner-authenticated, PIN-gated David Dashboard. Main dashboard navigation already links here.
- Original materials background optimized to WebP. No character versions, demo task records, preview controls, or public-homepage redesign.

## Implementation

- React task workspace with scoped styles, 120px phone / 180px desktop pastel task circles, construction-material background, approved motivational text and Add Task.
- Actual bounded travel and collision avoidance; six tasks per page. Motion pauses on mouse hover, keyboard focus, pointer interaction, an open task, a hidden tab or off-screen arena. Pause preference persists per user; reduced-motion users start with motion disabled. Motion resumes after task closure. RAF, observers and listeners are cleaned up.
- Existing Supabase task records drive active, completed, all-active and archived views. Add/edit/complete/reopen and explicit Carlos sharing call authenticated server actions. Fixed Carlos goal completion uses its existing manager-goal workflow.
- Delete task asks for confirmation and archives the task, with restoration available. No existing tasks were deleted during this release.
- Edits use the task's `updated_at` to reject stale overwrites. Save errors keep entered text visible. Task workflows link to existing supplier, quote, client, ABC and service-planner screens where applicable.
- Quote challenge, phone intake, pains, ideas and AI archive remain available under More tools. Permissions and PIN protection remain unchanged. No schema, credentials or production configuration changed.

## Business-task audit and import

Reviewed the focused Avantia business handoffs, the nine relevant active Codex thread summaries/latest business messages, local task queue and current dashboard/manager-goal records. No broad personal-history scan. Monday integration was disabled; no Monday request or task execution occurred.

Added five private tasks to verified production project `nprfhspwdflpqlopydmp`, using unique task keys and `ON CONFLICT DO NOTHING`, then read them back. They are source-backed follow-ups, not claims that supplier status was freshly confirmed. [Manifest and provenance](./business-tasks.json).

| Task | Record ID |
| --- | --- |
| Define the first profitable offer | `38a9fc30-253f-4ffb-998e-87932afcd017` |
| Await Lowe's partnership review | `c33f726b-9272-4c5b-9499-19365ff9409e` |
| Confirm Burton water-service quote | `2831f119-5301-43c4-a12f-e38a09be4585` |
| Reconcile Dandy partition quote | `47bc2270-8246-4ee7-bfd2-f718583abea7` |
| Finalize West Park roofing scope | `0f0c7b4f-2643-4dab-abad-2e3996e233f5` |

The Lowe's item is a follow-up milestone for an existing supplier-partnership profile, not a duplicate vendor profile or a request to resubmit its completed application. Existing client outreach, supplier relationships, ABC and WhatsApp tasks were not duplicated. Website/software chores and completed work were excluded from this import. Existing test-looking records were not automatically deleted.

No customer/supplier messages, purchases, submissions, calendar bookings or new automation were executed.

## Verification

- Six physics tests: frame-by-frame bounds and separation, sustained movement at five widths, and empty layouts.
- Two action-security tests: locked owners and unauthorized staff cannot mutate tasks or access data through the new actions.
- Eight isolated browser checks: real server-action CRUD and reload, Carlos workflow completion, stale edits, failed persistence, responsive movement/bounds/collisions, pause persistence, reduced motion/keyboard focus, touch close/resume and owner/staff/client access boundaries. A local-only in-memory Supabase fixture prevented production test writes.
- UI geometry tested at 320, 390, 430, 768 and 1440px. Phone and desktop screenshots inspected: no horizontal overflow, readable task names and recognizable construction materials. Local screenshots: `/tmp/avantia-dashboard-checks/local-390.png` and `local-1440.png`.
- 21 existing task/manager regression tests passed; 10 deployment-guard tests passed. Changed-file ESLint and diff checks passed.
- Two pre-existing static assertions fail against unchanged base files: outreach test expects five occurrences of a query where there are seven; homepage test expects older marketing copy. Exact tested files and their target source files match the base commit. They were documented, not weakened or used to roll back newer approved work.
- Full production build and TypeScript passed, including all 154 static pages. Local build setup needed stale generated dev types moved aside and a parent-level dependency link for RAM-backed build output; no application code or build checks were bypassed. Exact release and authenticated live verification are pending at time of this pre-release record; final evidence will be added to the shared release handoff.

## Release procedure and continuity

Preserve all previous approved work and unrelated root dirty changes. Codex is the only designated publisher. Recheck release ownership, both main branches and Vercel project/domain binding; fast-forward both mains to the tested candidate, pass release guard, trigger the existing approved hook once, then verify exact `/api/release` SHA and the live private dashboard on phone and desktop. No direct production CLI deployment or automatic deployment push.

The main root checkout was not reset or edited for app implementation. Generated build output uses `/dev/shm` due limited root disk capacity; only this task's earlier regenerable consultation build caches were cleared. No source or user files were removed.

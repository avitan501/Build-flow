# REQ03 / REQ04 — private step coordination and compact overview

## Candidate and ownership

Worktree `/tmp/avantia-request-list-cleanup-20260914`, branch `codex/request-list-cleanup-20260914`, builds on request-list cleanup `47def3ad`. Root owns master-context updates, approval of the exact production migration, integration with Communications and AI extraction work, and serialized publication. No push, deployment, or production database mutation by this agent.

## Implemented

- Each of Steps 1–3 opens a compact native dialog from its existing status pill: Carlos/David responsibility, In progress/Done, and internal note. Assignment/status save on change; note saves after 600ms or blur. Closing a dialog does not discard its draft.
- Shared per-request provider serializes saves per step. Field patches use optimistic revision checks. Conflict/failure retains the newest draft and offers explicit retry; success removes only the fields actually saved. Unsaved drafts recover from actor/request-scoped session storage. Leaving with unsaved edits warns the user. No Save button.
- Fresh product/pricing/payment prerequisites gate completion even when a stale saved override says Done. Reopened Items and fulfillment generate matching next-action guidance. Step3 reopening keeps existing payment/receipt/delivery facts; it does not claim physical delivery completed.
- Header responsibility derives from the first unfinished step. The approved Concept03-style attention control opens three vertical workflow steps and Activity in the **same bounded scroll area**. Closed state stays compact. All existing activity events are passed through; 20 show initially, with Show earlier for the rest, and full descriptions expandable. No invented actor names, statuses, or activity data.
- Removed the old large guide panel and bottom duplicate Activity launcher. The real lifecycle status control remains inside Request actions. Request-list deletion cleanup and Company screen shortcut are preserved.

## Database/security

Migration: `supabase/migrations/20260914175308_request_workflow_steps.sql`

SHA256: `7d8b6e4a8303c85f3aba538b59fceeed479514552e5b3a9c9cfbd421639cadfd`

New `public.request_workflow_steps` table has request/step primary key, staff assignee, bounded private note, nullable completion override, revision, updater and time. RLS is enabled, public/anon privileges revoked, authenticated grants limited to select/insert/update. Policies require existing approved-active role helpers **and** signed JWT email matching actual manager capability identities: owner `avitanneto@gmail.com` with admin role, or `buildavantiap@gmail.com` / `info@fivetownsbuilders.com` with staff role. No user_metadata authorization. Updated-by must match auth.uid(). Global helpers unchanged.

The server action requires the existing customers staff capability, validates input, and reuses the original Step1/2/3 completion validators in read-only validation mode before storing a completion override. Notes are never inserted into customer-visible project_events. No request lifecycle, payment, dispatch, email or SMS side effects.

Existing Step3 payment validation still treats quoted/closed lifecycle values as payment evidence, as before. This is **not** a new audit of financial proof. Staff REST access can write an override directly; the rendering reducer independently gates Done against fresh prerequisite eligibility. Existing project-event trust/permissions are unchanged and remain outside this bounded change.

## Verification

- 74 focused tests passed: new action/reducer tests plus existing product/proof/workflow/guidance/request list/material worktable/substep contracts. Updated old presentation assertions to the explicitly approved overview design, not weakened underlying completion guards.
- Seven release guards passed.
- Full webpack production build passed, including TypeScript and 153 routes. Existing preferredRegion deprecation warning.
- Full ESLint initially found two fixture-only issues; fixed the browser fixture hydration and Link usage. Final full lint passed (0 errors, 31 existing unrelated warnings). Diff/secret review clean.
- Real SQL on disposable network-disabled container `avantia-step-rls-test-20260914` (Supabase Postgres image): candidate DDL executes; Carlos inserts/updates; owner reads; customer reads zero, updates zero, inserts denied; inactive staff reads zero; active out-of-allowlist staff/admin read zero, update zero, insert denied; anon read denied; stale revision updates zero; original note preserved. Minimal auth/profile fixtures mirror the existing helper predicates. These tests are **not production SQL execution**. Test scripts are in `tests/request-step-rls-{fixture,check}.sql`.
- Existing Chrome, isolated contexts only, 390/1440: rapid typing during in-flight save preserves latest text; assignment saves; completion advances derived header; native Escape closes; failed note survives page reload and retries; conflict retains draft and explicit retry uses new revision; next-step navigation focuses target.
- Overview fixture with 35 activity entries: 20 initially, Show earlier exposes all 35, last description expandable, same bounded scroll area and no horizontal overflow at 390/1440. Screens `/tmp/request-concept03-390.png` and `/tmp/request-concept03-1440.png` (synthetic fixture data).
- Actual authenticated existing request read-only local rendering at 390/1440: compact header and overview render without overflow; no large guide; table-unavailable case shows an honest unavailable message and disabled edits. All browser POSTs blocked. Existing record showed zero loaded activity events, so the empty-state message was shown, not sample activity.
- Actual-record screenshots `/tmp/request-overview-closed-{390,1440}.png`, `/tmp/request-overview-open-{390,1440}.png`. Step editor fixture screenshots `/tmp/step-details-{390,1440}.png`.
- Temporary `/step-ui-check` route removed before build; reusable browser-only harness retained under `tests/fixtures/request-step-workspace-harness.tsx`. Existing employee Chrome/tabs, shared services and production data untouched.
- Disposable SQL container stopped after tests; its fixture-only data remains recoverable by restarting it. Local dev server stopped. No production records were deleted.

## Remaining release gate

Root/release reviewer must approve exact migration, independently verify live Supabase ref `nprfhspwdflpqlopydmp`, apply/review migration and advisors through the authorized production path, then publish the integrated latest candidate serially and verify live per-step persistence/role privacy/phone desktop behavior. No claim of complete live end-to-end behavior before that. Physical Safari was not tested.

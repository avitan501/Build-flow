# Request UI parity follow-up

> Historical UI-parity release record. Scope and evidence below remain useful for that release, but any pending-state wording applies only to its checkpoint. Follow [Remaining work continuation — 2026-09-15](request-finish-today-2026-09-15.md) for subsequent fixes, deployment status, live verification, and remaining scope. Do not treat an older pending gate as a current failure, or candidate/local-test evidence as proof of a verified live deployment. This notice does not certify a new deployment.

## Scope and decisions

User approved correcting the gap between approved UI/UX and live Steps 1–3, and additional Step 1 simplification. Base: verified production `683056426c31816f350099f33fa28b6a45cf4e85`, workflow34913868495 success, Vercel dpl_F7g3xkwDXEeH7vV1dpBMWAkty1gH, avantiabuild.com and Supabase nprfhspwdflpqlopydmp. No database or Edge changes in this release.

- Step 1: successful unchanged raw source uses native disclosure; extraction errors/progress/source changes remain visible. One next-item-needing-details control replaces duplicate navigation. Preserve resume, Undo, source evidence, autosave and concurrent-edit review.
- Step 2: default product-first comparison hides secondary navigation/management behind More; remove fixed totals and premature large finalize button. Continue to client appears after draft selections. Preserve draft/finalized distinction, product matching exclusions, existing actions and save failures.
- Step 3: five phases, main amount/action, three collapsed details; scoped accordion arrows. Public saved estimate link is the primary approval-sharing action. Manual approval remains explicit confirmed action under tools, never implicit on copy. Clipboard denial exposes selectable link. No invented sent time, approval, payment, delivery or document.
- Shared statuses: overview and step badges derive from the same saved/eligible state and guidance; no changes to completion authorization or prerequisites.

## Ownership and commits

Root integration tree `/tmp/avantia-request-ui-parity-20260915`, branch `codex/request-ui-parity-20260915`.
Root Step3/status `eeb77b47`, nested-disclosure regression `c3e59336`.
Step1 e44fe42b integrated as98f2fb05; Step2 b85f1b6a integrated as46dd0d3e.
Primary dirty workspace preserved. Root is sole publisher.

## Evidence before integration

- Root 32 Chrome/WebKit status/conflict/fulfillment checks, 4 clipboard-success/denial checks; follow-up22 checks including nested closed/open arrow orientation. Initial SSR test harness issue corrected to actual TypeScript-transpiled React; initial missing CSS before build rerun successfully.
- Step1 14 focused checks plus6 real Next-server 62-product/resume/mobile/wide checks; TypeScript/lint pass.
- Step2 final webpack153 routes, TypeScript/lint pass;30 Chrome/WebKit UI/regression checks and70 choice/match/CAS/comparison checks pass.
- Combined final webpack production build153 routes PASS,72 Chrome/WebKit focused tests PASS on the exact compiled candidate served locally at3118,23 release tests PASS,10 deployment guards PASS. An initial combined run mistakenly targeted older local3104 and overlapped CSS generation; rerun against completed candidate3118 passed all72. Postpublication authenticated read-only real-page checks required. Do not classify local sample screenshots as live.

## Boundaries and deferred work

This is a measured parity improvement, not a pixel-identical screenshot guarantee. Live records differ from mockup sample data. All/Needs-details filter remains a recommended next Step1 improvement. UI changes do not solve full AI extraction: candidate cb663a0a remains held for public-intake fallback/drain and actual62-row source verification. No customer messages, approvals, payments, orders or deliveries are performed during release tests.

# Step 1: raw list clarity and group supplier routing

## Scope and status

David approved group supplier defaults, per-product exceptions, multi-select changes and autosaving without sending messages. He explicitly approved reusing the existing OpenAI key. No key was copied or changed. Only avantiabuild.com is in scope.

Candidate branch: codex/raw-list-ux-20260911, worktree /tmp/avantia-raw-list-20260911. Base896855bd already includes locally tested undeployed comparison/status work; production was3f8a5353. Organizer commit7d220faa cherry-picked as7ec543f3; routing commit1118b35c cherry-picked as23227566. Quote-autosave137ffe5a remains a separate candidate and is NOT included here.

## Implemented

- Raw Free-text material list storage rows never appear as selectable products. The original remains visible and editable; premature supplier substep and old completion timestamp are hidden before extraction.
- Clear waiting/processing/retry/failure labels; polling continues when a refresh returns the same state and pauses while hidden. A single visible status poller is used for raw lists. Split list catches unconfirmed action failures without claiming completion.
- Group-level supplier editor; individual and explicit multi-select overrides; reset to group. Existing legacy supplier selections and explicitly empty overrides are preserved by group changes. Supplier notes remain available in a collapsed disclosure. Product names wrap so different lengths are distinguishable on phone.
- Atomic staff/RLS-scoped RPC validates authoritative membership after locks and checks revisions. New explicit editor calls require complete revision maps; raw placeholders are rejected. Existing no-mode callers remain compatible but do not offer stale-client CAS protection.
- Dirty supplier edits block controls that would unmount them, explicit comparison navigation, plain anchor navigation and normal page unload. Save failures retain selections and expose Retry; no message/send action is invoked.
- Organizer validates completed, nonempty structured output before product insertion/deletion; attachment download failures are no longer omitted silently. Safe failure codes survive organizer/worker/queue. Existing timeout budgets retained with response-body reads inside the deadline.

## Verification

- 63 targeted Playwright tests passed (single Chromium project; helper/static/action-contract tests), plus scoped ESLint, whitespace and changed-diff secret/conflict-marker scans.
- Existing noVNC Chrome: raw retry/failure views at320/390/1440, no placeholder checkboxes/Ready, no horizontal overflow. Processing produced3RSC requests over the observation window with unchanged status. Supplier editor at390/1440: intercepted save failure retained check, blocked group selection while dirty, Retry succeeded, batch selector opened, no page errors/overflow. These synthetic browser responses did NOT write production and are not live browser-to-DB evidence.
- Isolated PostgreSQL tests: legacy and empty override preservation, reset, cross-group batch, subset/cross-group rejection, stale transaction rollback; real simultaneous writers yielded one winner/one stale rejection; concurrent department move detected after locks. No production migration applied.
- Organizer51tests and Deno type checks for both functions passed separately.
- Final clean-cache production build passed:153routes, TypeScript complete. Existing preferredRegion deprecation warning remains unrelated.
- Screens: /tmp/avantia-raw-list-phone.png, /tmp/avantia-raw-failed-{320,1440}.png, /tmp/avantia-group-routing-{390,1440}.png. Temporary fixture route removed; local test tabs/server closed. Stale generated dev type cache was moved to /tmp/avantia-raw-list-type-cache-dH5p2H/dev after the first build referenced the removed fixture; final clean-cache build result recorded in master context.

## Release requirements / remaining work

NOT deployed, pushed or applied to production. Requires explicit release approval, fresh target/commit verification, migration20260911022459_request_supplier_group_routes.sql, website release, and BOTH client-material-list-ai/client-material-list-worker plus shared helper. Preserve all newer approved changes when integrating.

The precise root cause of request638408's generic502 remains unconfirmed. This package improves validation and diagnosis; only a verified successful live retry can establish that the request is fixed. Do not claim it has already been split.

New request creation already queues raw text/uploads automatically. Editing an existing raw source does not yet auto-reorganize: source generation races and reviewed/priced product protection need a separate safe design. Recent-supplier suggestions and automatic group-default inheritance for newly inserted/moved items are not implemented. Existing group edits apply to the currently validated group; moved rows must not be represented as inheriting their new group until explicitly assigned/reset. No orders, supplier messages, API/model changes or production business mutations performed.

# Communication center simplification — 2026-09-14

## Scope and integration

- Sole implementation agent: `communications_finish`; no delegated subagents.
- Worktree: `/tmp/avantia-communications-resume-20260914`.
- Branch: `codex/communications-resume-20260914`.
- Based on live `58c5c6548e8e34c292447fdfd59ed2aa86575f87`, with previously paused changes cherry-picked as `87cfdfa2c8199fc97a390c78edd902bd7b11a6e5`.
- Root owns integration, the master context and any serialized production release. No push or deployment performed by this agent.

## Implemented

- Compact All / Unread / Needs reply / System views; advanced channel/contact filters collapsed by default.
- No-reply sender patterns (including `meetings-noreply`) appear in System and are excluded from Needs reply. This is a presentation filter, not an AI classifier or a change to notification delivery.
- Separate Chat / Files views, including access to older-message files through existing history pagination.
- Expandable long text and quoted email history; original text remains recoverable.
- Reply suggestions and quick replies grouped under Reply tools. Optional email subject editing is compact.
- Optional AI training/model details collapsed; safety decision/review indicators remain visible.
- Message body drafts persist in the current browser tab, scoped by signed-in account, channel and recipient address. Address keys survive directory name/link remapping. A new-message composer has one reusable buffer per channel until sent; it does not create a separate draft for every edit of its recipient field.
- A successful send clears only the submitted text, not newer text typed during the request. Failed sends retain text. AI generation and request invitations explicitly write to their destination channel/address when changing composer channel in the same render batch.
- Files are not persisted and are cleared when switching conversation/channel, avoiding accidental cross-recipient attachments. Subject edits are not persisted; the UI deliberately says **Text draft**.
- Directory cache is scoped to the signed-in account; blocked browser storage has an in-memory draft fallback.

## Files

- `app/admin/communications/page.tsx`
- `components/buildflow/unified-communication-inbox.tsx`
- `components/buildflow/communication-message-text.tsx`
- `components/buildflow/use-communication-draft.ts`
- `lib/communication-presentation.ts`
- `tests/communication-simplification.spec.ts`
- `tests/communication-history-pagination.spec.ts`

## Evidence

- 31 focused communications tests passed (history, image preview, next action, control system, mobile new-conversation target and simplification).
- 15 affected tests rerun after final explicit AI draft destination fix: passed.
- 23 standard release regression tests: passed.
- 7 deployment guard tests: passed.
- Full ESLint: 0 errors, 31 pre-existing warnings outside the changed files. Targeted ESLint rerun after final changes: passed.
- Authenticated existing Carlos session copied only in memory to isolated localhost contexts. Browser POST requests were blocked for interaction checks; no customer test message or intentional mark-read mutation was sent.
- Actual desktop 1440×1000 / phone 390×844 browser interactions verified draft preservation through conversation/channel changes and reload, Chat/Files switching, All/System/Needs reply filtering, mobile back-to-list navigation, and no horizontal document overflow.
- Screenshots: `/tmp/communications-verified-desktop.png`, `/tmp/communications-verified-mobile-list.png`, `/tmp/communications-verified-mobile-chat.png`. The latter predates the final optional-training collapse; later live-data attempts could not locate a current draft panel and therefore do not establish expansion behavior.
- The draft storage test runs the real transpiled hook callbacks with a minimal hook harness (not a browser renderer), plus actual authenticated browser persistence checks above.
- Corrected an existing stale history source assertion: current production delegates delta loading to `aura-messaging-broker`, whose SQL already hydrates `aura_communication_links`. The test now verifies that actual path, not removed route-local helpers. No backend code changed.
- Diff whitespace and manual regression/secrets review passed; no credentials or dependency additions in this change.

## Release and limits

- `npm run build -- --webpack`: passed, including Next TypeScript and static generation. Standalone `npx tsc --noEmit --incremental false`: passed. Existing `preferredRegion` deprecation warning remains outside this scope.
- Owned dev server PID 1062858 stopped before build. Generated `.next/dev/types` moved to `/tmp/avantia-communications-dev-types-20260914` to avoid stale dev-generated route export validation; no source files removed.
- No database migration, provider configuration, Tailnet/Lowe's change, external send, push or deployment in this pass.
- Existing page-load background inbound synchronization remains unchanged; local rendering uses production-backed read APIs.
- Real provider send delivery was not tested; existing send behavior is retained and source regressions pass. Production owner/Carlos visual verification remains the release owner's responsibility.
- Subject/file persistence, new assignment/internal-note UI, notification backend changes and communications beyond this scoped simplification are not implemented here.

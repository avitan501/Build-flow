# Shared incomplete client quote draft — mixed-route first release

Base: `0407415af149c9646472e06368c171083a6fd54c`.
Branch/worktree: `codex/client-incomplete-draft-20260915`, `/tmp/avantia-client-incomplete-draft-20260915`.
Owner: Noam. Root owns integration, migration approval, publishing and live verification.

## Scope

- One shared staff draft per finalized mixed-route comparison, not separate invisible David/Carlos copies. Legacy single-supplier UI keeps manual Save/Send; its delivery path has no equivalent prepared-draft claim, so it is not labeled autosaved.
- Raw incomplete client, quote number, message, delivery, tax, bulk markup and item-price strings persist independently of financial rows. Blank prices never become publishable zero/cost values.
- Dedicated RLS table with service-only RPC access. Server actions authenticate staff and pass the signed-in actor; existing narrow actor helper verifies approved active accounts without granting service-role access to auth.users/private schema.
- Revision compare-and-swap prevents a second editor overwriting a newer draft. Source snapshot comparison fences old route/client/cost baselines.
- Load once; explicit latest-draft review on conflict. No polling or provider calls. Existing queue handles debounce, in-flight newer typing, failed save retention and navigation warnings.
- Preview/Prepare/Send require all item prices and required fields. Prepare and Send flush draft first, but flushing alone is not treated as a concurrency fence. The new mixed Prepare RPC atomically checks current draft revision/source and records a prepared revision/snapshot with the finalized quote. Send claim requires current revision = prepared revision = requested revision and exact prepared/finalized snapshots. Autosave itself never changes quote status, supplier award, client approval, financial rows, delivery or payment.
- Prepare quote is an explicit business action (previously Save quote), not the draft save button.

## Conservative boundaries

- Prepare changes the finalized source and acknowledges the prepared shared revision. Sending that exact prepared version remains available immediately, but a later team draft edit blocks the send claim. Further editing after Prepare must reload/review the new finalized source; no blind rebase or shared-draft deletion.
- A loaded older-source draft is never applied automatically. Human-readable details stay available; choosing current quote does not delete the old draft until the user edits and a revision-CAS write succeeds.
- Conflict review does not merge or replace local typing. Unacknowledged local edits remain in memory and navigation is warned/blocked by the existing queue; they are not promised durable across closing the browser.
- Parent-row locks are not claimed to make every financial/source workflow atomic. Actual legacy child triggers were tested in both operation orders. A later committed source edit makes the retained draft stale on the next load, even if the draft write happened first.
- This is not full-site autosave. Provider dispatch and ledger workflows are unchanged. Existing final Save/Claim entry points fail closed when a shared draft exists, preventing older callers from bypassing the new revision fence. New raw draft saves require an active finalized route.

## Verification

- Actual React ClientQuoteBuilder in Chromium and WebKit, with all actions/network mocked: incomplete values, blank prices, remount/reload, typing during in-flight save, refresh preservation, failed save, team conflict, explicit review, stale-source restore gate and Send-after-ack ordering.
- 60/60 browser/queue tests passed: 28 actual-editor/helper cases across Chromium and WebKit plus 32 existing autosave queue/actor-record scope regressions. Positive Prepare → Send, newer team draft after Prepare, editing after Prepare, historical read-only preview and missing active route were exercised.
- `node tests/client-quote-draft.local.mjs`: disposable network-none PostgreSQL; reuses captured full schema/indexes/grants/legacy functions, real child triggers, mixed-route migration and narrow actor helper. 141 constraints and 31 triggers after adding the new draft table.
- SQL checks: active staff roles, forbidden direct access, malformed field shape guards, raw blanks, no financial mutation from autosave, revision conflict, stale price/client/item/award source in both contention orders, safe 55P03 retry, two-actor CAS, immutable mixed-route claim, unchanged mixed A/B client-save/send guard suite. Atomic Prepare/Claim tests reject clean-stale drafts, a second write after flush, old-entry bypass, forged current-but-unprepared revision, and both draft/claim contention orders. AI provider/publication concurrency is not rerun by this draft-specific harness.
- TypeScript, targeted ESLint and whitespace checks passed. No real messages or production/business writes by this subtask.

## Release gate

Migration `20260915024232_client_quote_incomplete_drafts.sql` must be reviewed/applied by root to the independently verified production binding before enabling this UI. Without it, the UI intentionally stops at a recoverable loading error instead of pretending edits save. Root must rerun integration/build and authenticated live checks. No deployment or migration apply was performed by this subtask.

The dynamic preservation of installed business validators has unique-replacement assertions and exact reviewed `prosrc` MD5 refusal checks. Local full-schema sources matched root's independent production read:

- Legacy save: `699e66f6b197cb3bea82e3de08ca75d9`.
- Mixed save: `e6394d3a2189bcfca808189851f475f8`.
- Mixed send claim: `d01f2291c394b437dc0c1aa67b529bc1`.

No source drift is silently rewritten. Root must review a mismatch before applying.

## Root integration update

- Root reported the original SQL payload `5e76ea8c61c0ea9fede4ea6625763a6f0a26d9ae3deb66894c0a73376b9470d6` applied to the verified live binding under migration version `20260915032604`, before the UI release. This subtask did not run that production action.
- A compatibility nuance was identified immediately: the added legacy gate initially reused the named actor check, which would narrow existing capability-only legacy staff. The append-only follow-up `20260915032659_client_draft_legacy_capability_guard.sql` restores the original admin-or-suppliers-capability decision, fails closed if either dependency returns NULL, and leaves every new mixed-route named actor check unchanged.
- The original applied SQL is not rewritten. The follow-up has separate review/hash and a real capability-only legacy Save regression, revoked-grant rejection and null-helper test; root owns its production application and final migration-history alignment.

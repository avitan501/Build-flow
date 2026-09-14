# Trusted-match concurrency repair — Noam

Base: coordinated `de7505ae`. Worktree: `/tmp/avantia-trusted-match-lock-safety-20260914`.

The comparison-first confirm/award RPCs previously waited on child rows held by an ordinary edit whose AFTER trigger was waiting on that comparison. This creates a real parent/child deadlock, not just a slow query.

## Change

Only the existing, not-yet-published trusted-match migration is changed. Confirm and award keep their parent lock and acquire subordinate request/item/bid/price locks with `NOWAIT`. On contention the statement aborts with SQLSTATE `55P03` and: “Another update is in progress. Nothing was saved; retry after it finishes.” No source mutation or automatic retry is introduced. All authorization, NULL/NaN, scope, source CAS and full-coverage guards from the coordinated base remain unchanged.

This is a bounded safe-abort repair, not a claim that all existing write paths have a common lock order. The mixed-route reviewer separately owns finalization/save locks. UI error rendering was not changed or browser-tested by this task; callers must keep the operation retryable and must not mark it saved/completed after `55P03`.

## Executable verification

`node tests/trusted-match-concurrency.local.mjs --baseline`

- Both actual RPCs reproduce `40P01` with NOWAIT removed.

`node tests/trusted-match-concurrency.local.mjs`

- Both RPCs instead return `55P03`, with the retry message and no `40P01`.
- Before/after JSON snapshots are identical for the comparison/draft, request-product comparison rows, supplier bids, prices/source wording, and review confirmations after abort/rollback.
- Explicit uncontended confirmation and award retries succeed.
- Tests include the actual existing product-choice child invalidation function/triggers, not substitute test triggers.
- Existing trusted-match SQL authorization/source/partial-coverage tests run as setup against each candidate and pass.

The test accepts no remote connection string; it runs only in the named network-isolated local PostgreSQL container `avantia-noam-match-20260914`. Each generated test database is dropped afterward. No production/schema deployment, live orders, supplier messages or external credentials were touched.

An initial test-harness interpolation error was fixed by using a replacement callback, so JavaScript does not interpret PostgreSQL `$$` function delimiters. Both final commands above exited 0. `git diff --check` passed.

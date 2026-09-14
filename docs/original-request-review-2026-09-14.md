# Original-only request review — Maya

Base: coordinated candidate `7a2483cc`. Isolated branch `codex/original-request-review-20260914`.

Structured original-only products now use the compact Step1 review list and existing supplier routing once inside Step2, just like mixed requests. Raw intake placeholders remain excluded. The supported original editor is preserved: no original product is submitted to organized-product review/Undo actions. Original edits explicitly say to save changes; this is not a claim of universal autosave. Successful original saves clear the local review snapshot before router refresh, avoiding a false coworker-change notice about the user's own edit. Failed saves do not run that callback.

Files: request page (two eligibility gates), review-list component (guard/copy/callback), original editor (successful original-save callback), local-only preview fixture and regression test. No database/schema/action change and no production mutation.

Verification: 18 Playwright checks passed across Chromium and WebKit, including original-only and mixed views at390/1440, editor open/cancel, no organized answer/Undo controls, no false autosave copy, no horizontal overflow, no POST requests and existing continuity helpers. Scoped ESLint and whitespace checks passed. Screenshots `/tmp/original-review-original-390-chromium-desktop.png` and `/tmp/original-review-original-1440-chromium-desktop.png` (synthetic local fixtures, not live customer records). First test draft expected the wrong existing button label `Save`; corrected to actual `Save changes` before green run.

Standalone `tsc --noEmit --incremental false` passed. Integration: reviewer attachment-alert changes affect a different block in the same review-list file. Preserve both. Full combined build, authenticated persistence tests and deployment remain root/release-review gates. No external messages, customer record edits, deployment or credentials output.

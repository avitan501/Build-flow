# Queued-only app safeguard (independent of chunk rollout)

Base 4c79045e. Only production files changed: lib/material-request-organization.ts and app/owner/materials/requests/actions.ts. No migration, Edge change or checkpoint dependency.

Failed durable enqueue no longer starts direct unleased AI/provider work. The explicit Organize action returns a truthful failure (“Your original is saved. Splitting could not start. Please try again.”). Successful durable enqueue keeps the existing signed requester RPC and optional after-response worker nudge; nudge/context failure does not undo the queued job, which remains eligible for existing cron processing.

Six executable mocked tests run the actual transpiled helper and organize action, covering failed/successful enqueue, invalid request, after/worker failure and no direct provider/checkpoint path. Existing durable queue regression expectation updated. No live enqueue, worker dispatch, AI call or provider request occurs in tests.

Verified: all six mocked tests + 18 durable queue regressions passed; fresh Next route typegen and full standalone TypeScript passed; targeted ESLint and git diff-check passed. Final combined application build remains the publisher's integration gate (full AI branch build already passed, but is not substituted for this smaller release).

This does not enable resumable/chunked extraction or certify PDF row quality. Full AI migration/worker rollout remains held pending an approved drain and supervised source proof. Root owns integration/publishing; this backport is safe to review separately from that package.

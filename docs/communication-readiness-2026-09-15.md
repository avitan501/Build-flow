# Communication readiness reliability

Base: live `0407415af149c9646472e06368c171083a6fd54c`. Isolated worktree `/tmp/avantia-communication-readiness-20260915`.

Observed production email status fluctuated between HTTP200 ready and HTTP200 false flags with the same Carlos session. Browser GET loader was not blocked by the read-only harness. Exact failing broker/provider dependency was not identified; the source reliably collapsed unknown/error into disconnected. Successful status responses establish configured capabilities, not actual email delivery.

Changes:

- `loadAuraConnectionStatus` returns null for failed/non-ok/malformed broker status rather than manufacturing disconnected channels. The status API returns503 with verified:false, or verified:true with valid flags. Authentication and manager access checks remain unchanged.
- Client distinguishes checking, unavailable, and verified. Verified false means genuinely unconfigured; errors say the check is unavailable and preserve the draft. Email/SMS/WhatsApp send controls and handlers require verified readiness.
- Keeps last checked channel flags within the same actor scope only; no browser/global cache. A new actor must obtain a fresh check. Late/aborted checks cannot replace a newer response.
- Up to two automatic retries, bounded delays and a20-second fetch timeout; manual Retry/Check again and refresh inside the collapsed Connections panel. Healthy composer adds no new controls.
- No provider configuration, credential, schema, webhook, AI, draft-storage, or message-send action changes. No production writes or deployment performed by this task.

Tests: real React hook in Chromium/WebKit verifies unknown/retry/ready/verified-disconnected, preserves flags while blocking unverified send, bounds retries, rejects malformed responses, ignores late checks, and isolates actor changes. Actual server readiness function exercised with broker failure/success mocks; existing pagination/deep-link regression suite included. Parent must run the integrated build and post-deployment UI checks. No email send was performed.

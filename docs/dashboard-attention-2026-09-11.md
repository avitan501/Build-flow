# Dashboard attention audit — Maya — 2026-09-11

## Evidence and scope

- Production independently confirmed through `https://avantiabuild.com/api/release`: `9ce50cdd33390f70a61c172ba124cdea5774ffee`, Supabase `nprfhspwdflpqlopydmp`.
- Five screenshot failures are persisted Quo `undelivered` outgoing SMS from September 10, 22:47–22:49 UTC. Four recipients have later successful outgoing messages, but none has a later successful identical-body message. Do not infer resolution or hide these failures.
- No matching general message-outbox record exists for these five rows. Their synced webhook envelopes contain activity/conversation identifiers only, without provider error reasons. The root delivery cause cannot be established from this evidence; provider investigation is still required.
- Dashboard previously inferred `Customer needs a reply` solely from incoming `read_at IS NULL`. One displayed unread SMS has three later outgoing messages; another displayed entry is an account-creation email. Unread does not establish sender role or reply requirement.
- Read-only investigation only: no sends, resends, contact changes, read-state changes, provider settings, database updates or deployments.

## Implementation

Isolated branch `codex/dashboard-attention-20260911`, worktree `/tmp/avantia-dashboard-attention-20260911`, based on verified live SHA above.

- `lib/dashboard-attention.ts`: truthful status labels and separate delivery/unread/request groups. No filtering out failures and no reply inference.
- `components/buildflow/dashboard-attention.tsx`: compact native accessible category disclosures, counts, dated recipient rows and Review links. Existing design retained, reduced text. Query failures can be shown explicitly rather than falsely claiming no issues.
- `tests/dashboard-attention.spec.ts`: three tests passed; targeted ESLint and diff whitespace check passed.

## Integration contract for primary agent

Do not cherry-pick any edits to `app/admin/build-map/page.tsx` from this worktree: none were made, because Noam owns that file concurrently.

1. Import `DashboardAttention` component and `communicationAttentionTitle` helper.
2. Failure row title: `communicationAttentionTitle(message.channel, message.status)`; unread title: `communicationAttentionTitle(message.channel)`. Add `occurredAt: message.occurred_at` to both maps.
3. Replace old `attention-heading` section JSX with `<DashboardAttention items={attentionItems} unavailable={Boolean(failedMessagesResult.error || unreadMessagesResult.error)} />`. Ensure Promise fallback results include `error: null` or normalize errors before use.
4. Remove global `.slice(0, 8)` on the combined attention list; it arbitrarily hides later categories. Existing per-query bounds remain, so counts must say `shown`, not claim all outstanding issues.
5. Remove unused icons only if they have no remaining references.
6. Verify integrated phone/desktop disclosure, keyboard and exact review-link navigation. Check query-error UI and empty state. No browser check or full integrated build is claimed here; primary owns integration and live verification.

Deployment status: not deployed. Preserve all five unresolved delivery issues. Login to the existing noVNC staff session is required for authenticated live verification. Root should link this report from the master context while recording the integrated commit/tests/deployment.

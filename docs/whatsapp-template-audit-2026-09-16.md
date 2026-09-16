# WhatsApp template audit — 2026-09-16

Website fix owns this scoped release following David's campaign handoff. Campaign task was idle; shared master context records ownership. Original diagnostic branch/worktree94cc6e1f preserved. Integration branch `codex/whatsapp-template-audit-20260916` builds on that commit and verified production d66c4ff5.

## Evidence

- Canonical production d66c4ff5 / Supabase nprfhspwdflpqlopydmp. All seven broker193 deployed files exactly match the production commit. Vault provider Meta, WABA1609047970612779, app2874339416276903, phone1266268263238386, sender+15169901990, Graphv25.0 match.
- Read-only Graph GET using the existing Vault credential returned HTTP200 with seven approved templates and no next page. No credentials printed or changed. A stale local token probe returned190; that token is NOT the live Vault token and is not evidence of a production credential failure. Stale local DB credential was rejected before connection; no alternate project accessed.
- All four Utility templates are APPROVED with API language **en**: quote_request_received(1820391496055024), service_request_received(1330744265590700), quote_ready(2640402343056867), order_received(1474802134472727). Remaining three are Marketing and were not selected or changed.
- Failed communication0749e63d-3b83-4b1d-baf0-7b7ee8298eae stores the expected service_request_received body and ordered values David / a WhatsApp connection test. No retained callback error exists. Historical raw POST was not logged; deployed code plus stored communication prove the mapping, not a recovered packet capture.
- Deployed website action passes the selected templateName and ordered parameters. Broker checks exact approved name/category and uses returned language. No silent fallback. Dynamic component is body with two text parameters for service_request_received. Meta also defines static footer Avantia Build and Add details quick reply; no header or dynamic button URL. No demonstrated sending mismatch; sender payload unchanged.
- Actual approved service body: Hi David, we received your request for a WhatsApp connection test. Our team will review it and contact you here with the next update.

## Changes

- Integrate existing94cc6e1f safe numeric callback diagnostics and accurate Accepted vs Delivered UI copy. No schema migrations.
- Demonstrated UI discrepancy: quote_ready preview rearranged approved wording via generic client-link formatter. Restore exact approved body. Show approved static footer and quick-reply label for all four Utility previews.
- Local actual-function mocked-transport tests exercise all four names, en language with unrelated en_US decoy, parameter order, sender endpoint, stored body and exact UI preview. No real message sent by tests.
- Existing actual PostgreSQL17 handler tests exercise duplicate/out-of-order/error/privacy/signature behavior against isolated network-disabled container.

## Remaining controlled test

At15:44UTC production latest inbound from David5077 remains2026-09-15 23:16:04UTC. Outside-window initiation test is allowed only AFTER2026-09-16 23:16:04UTC (19:16:04 New York), provided a fresh exact-recipient query confirms no later inbound. Do not send early or claim Accepted proves delivery. Send only one authorized Utility test; inspect final callback for Delivered/Read or recorded Meta error. No send scheduled or executed during this audit. Existing inbound/reply that reached Read remains unchanged. Delivery issue remains unresolved until that test.

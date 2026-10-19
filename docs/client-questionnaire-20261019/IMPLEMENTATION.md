# Client questionnaire — approved UI/UX improvements

David authorized this implementation after reviewing the question and UI/UX recommendations on October 19, 2026. Codex is the sole implementer, on `codex/client-questionnaire-20261019` in `/root/avantia-client-questionnaire-20261019`. This is a local preview revision; no production publisher or release is active.

## Result

- Plain native choices retained. A single answer compacts to an editable summary. Multiple services remain visible until Done, with focus moved to the visible edit control. Only one selected material panel expands at a time.
- Project type and delivery use radio choices. “No major time spent” cannot coexist with a time-consuming task. The time-spent question is optional.
- Source questions now ask how to obtain lists/details, with practical trade/plan/list choices and uncertainty routes. Interiors has a scope hint. Roofing’s approved wording and sequence are retained. No HVAC category was added.
- Material-specific services supply the short recap and submitted priorities. The general service question is only a fallback when no specific services have been selected. Existing additional-help selections are retained in submitted answers.
- The introduction is shorter and shown only on the opening step. First choice top measured about497px on desktop and542px on phone, within the tested viewport. Follow-up labels are14px with40px desktop and44px touch rows. No horizontal overflow detected.
- Contact comes near sending: name plus either email or phone, validated inline. The review shows the chosen material services, delivery and contact, with edit controls and an expandable full answer list.
- Receipt appears before optional town/ZIP and first-needed timing. Skip and retry do not resubmit the original request. Refresh retains the receipt. Extra details appear with the same response in the owner inbox and download.

## Persistence and access

Original submissions remain immutable. The additive `20261019185909_add_client_questionnaire_followup.sql` migration creates a separate details table linked to a submission. It was applied only to the disposable local preview database and separate `questionnaire_revision_test` database. The new endpoint requires a signed, submission-scoped,24-hour capability issued after a successful submit, validates its body and same-origin request, and has no public read route. Owners read details through the existing guarded client-response API. No credentials are stored in source or this report.

The original owner-led questionnaire, its routes and `lib/contractor-discovery` have zero diff against baseline `a609cb8b`. Existing answer keys and draft storage key are retained. Renamed historical choices become editable Other text rather than silently disappearing.

## Verification

- 13 questionnaire API/security/generated-assets/real PostgreSQL checks passed, including immutable original records, private table privileges, capability binding/expiry/tampering, retry idempotence and concurrent quota enforcement.
- 5 original contractor-discovery API checks passed.
- Targeted ESLint, diff checks and full Next production build/TypeScript passed. The build reports the repository’s existing preferredRegion deprecation warning.
- Desktop Chromium and phone WebKit UI scenarios verify multi-select, focus, fallback/recap, exclusivity, inline validation, all material groups, Other persistence and post-submit retry/skip.
- 10 UI browser scenarios passed on the final production build. All 6 integrated browser-to-database/inbox checks passed on desktop Chromium and phone WebKit, including original+extra details, single-record retries, forged capability refusal, safe rendering, storage failures and owner/staff access. An initial test read a hidden confirmation label before submission completed; requiring visible confirmation fixed that test race. No application change was needed.
- Visual evidence: `revised-flow/measurements.json`, desktop/phone opening, material choices and recap screenshots. These are isolated synthetic browser contexts; the user’s browser session was not cleared. This is not a measured completion-time or conversion study.

## Files and runtime

Primary changes: `lib/client-questionnaire/{form.html,styles.css,questions.json,schema.ts,store.ts,followup.ts,inbox.html}`, generated JSON browser assets, public submit/followup API, additive migration, questionnaire test suites and local fixture support.

User preview remains on port3110 with its local-only storage adapter on3119 and disposable PostgreSQL container `avantia-client-questionnaire-20261019`. Final E2E checks use a separate database, adapter3129 and production build3120 so their resets cannot erase the user’s preview responses. The initial submission migration and this additional details migration must both be applied to the independently verified production target before an authorized release. Nothing has been pushed, merged or deployed; no external messages were sent.

Next: David reviews the updated live-editing preview. Publishing requires a new explicit release request and the repository’s production checks.

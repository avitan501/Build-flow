# Booking page questionnaire link — October19,2026

David requested the live client questionnaire link in the appointment-scheduling flow. Codex sole editor; /root/avantia-consultation-questionnaire-link-20261019, branch codex/consultation-questionnaire-link-20261019; based on verified live/main ea6570800b101c9ad309eb9579bbe012d5093e0c.

Added an optional Before we meet section immediately after ConsultationCalendar. It stays present for both date/time selection and the embedded Google booking step. Copy: Share your material needs so we can prepare. Link: Fill out the questionnaire → /questionnaire, new tab, noopener/noreferrer and accessible new-tab indication. Uses current green booking styling, responsive layout and44px link target.

Only app/consultation/page.tsx and consultation.module.css changed. Google appointment settings, booking logic, questionnaire responses and email delivery unchanged. No bookings/messages/data writes.

Verification: ESLint/diff checks passed; all4 existing calendar tests passed. Desktop Chromium and iPhone WebKit checks verified link opens the current questionnaire in a separate tab, selected appointment iframe source/form remain intact, no page errors/overflow. Screenshots inspected. Google iframe intercepted in local checks; actual provider booking is unchanged and was not submitted. Full production build/release checks required before publication.

Preview: http://localhost:3130/consultation ; dev server3130 running using local fixture3119 environment only. App open requested, response queued. Not published; production remains ea657080.

David also asked whether completed questionnaires can be emailed or saved in the software. Verified existing API saves to private client_questionnaire_submissions, with optional details in client_questionnaire_followups. Owner inbox https://avantiabuild.com/owner/service-planner/client-responses supports read/download/print and was linked in chat. This form has no email notification call. Other application notification code uses Resend with owner default avitanneto@gmail.com; no email changes or sends performed. Recommendation given: software as primary record, optional email alerts. Email preference remains exploratory; do not claim alerts are enabled.

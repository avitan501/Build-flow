# Booking page questionnaire link — October19,2026

David requested the live client questionnaire link in the appointment-scheduling flow. Codex sole editor; /root/avantia-consultation-questionnaire-link-20261019, branch codex/consultation-questionnaire-link-20261019; based on verified live/main ea6570800b101c9ad309eb9579bbe012d5093e0c.

Added an optional Before we meet section immediately after ConsultationCalendar. It stays present for both date/time selection and the embedded Google booking step. Copy: Share your material needs so we can prepare. Link: Fill out the questionnaire → /questionnaire, new tab, noopener/noreferrer and accessible new-tab indication. Uses current green booking styling, responsive layout and44px link target.

Only app/consultation/page.tsx and consultation.module.css changed. Google appointment settings, booking logic, questionnaire responses and email delivery unchanged. No bookings/messages/data writes.

Verification: ESLint/diff checks passed; all4 existing calendar tests passed. Desktop Chromium and iPhone WebKit checks verified link opens the current questionnaire in a separate tab, selected appointment iframe source/form remain intact, no page errors/overflow. Screenshots inspected. Google iframe intercepted in local checks; actual provider booking is unchanged and was not submitted. Full production build/release checks required before publication.

Preview: http://localhost:3130/consultation ; dev server3130 running using local fixture3119 environment only. App open requested, response queued. Not published; production remains ea657080.

David also asked whether completed questionnaires can be emailed or saved in the software. Verified existing API saves to private client_questionnaire_submissions, with optional details in client_questionnaire_followups. Owner inbox https://avantiabuild.com/owner/service-planner/client-responses supports read/download/print and was linked in chat. This form has no email notification call. Other application notification code uses Resend with owner default avitanneto@gmail.com; no email changes or sends performed. Recommendation given: software as primary record, optional email alerts. Email preference remains exploratory; do not claim alerts are enabled.

## Owner email alert — approved addition

David subsequently said “Yes, my email.” The owner recipient is fixed to `avitanneto@gmail.com`, matching existing production order notifications. Earlier exploratory/no-email notes above are superseded by this authorization.

Implementation: after a **new** durable questionnaire save, Next `after` calls `lib/client-questionnaire/notification.ts`; duplicate submissions do not schedule another alert. The caller retries transient failures up to three times with bounded timeouts. A new, isolated `supabase/functions/client-questionnaire-notify` function requires the existing service-role credential, reads the saved record, and sends only the owner a contact summary plus private inbox link. It cannot accept a recipient/message override. HTML is escaped. Provider deduplication uses the canonical saved UUID, and receipts older than23hours are refused to stay inside Resend’s24hour idempotency window. Emails never include submission capability tokens. Email/scheduling failures log a safe error and leave the successful response/receipt intact.

The function reuses the **same production Supabase project's** existing RESEND_API_KEY and QUOTE_SUBMISSION_FROM; no keys copied or changed. Read-only inspection verified the existing public-quote-intake function uses those variables and the owner address. Vercel has no production RESEND_API_KEY, so direct Vercel-to-Resend delivery was rejected in favor of the existing mail environment. Production service-role/URL entries are sensitive and values were not exposed. Existing mail functions remain unchanged. There is no durable mail outbox or later automatic recovery after all three attempts fail; saved responses remain the source of truth. No promise of inbox delivery until provider/live verification.

Release pending: deploy **new** client-questionnaire-notify with verify_jwt=true and explicit service-role check, after independently verifying active production binding nprfhspwdflpqlopydmp. Verify provider configuration/delivery with one clearly labeled owner test during authorized release. Then publish tested application candidate using only the approved hook, preserving all approved live changes. Do not redeploy/replace public-quote-intake, copy secrets, or send client mail. No production mutation, test email, deployment or booking has occurred in this task.

Verification:15 API/notification tests pass, covering caller authorization, injection, escaped content/fixed recipient, nonexistent/expired records, provider failure, retry behavior, saved-only scheduling, and continued save success after notification failures. Edge handler standalone strict TypeScript check and focused ESLint pass. Booking link desktop/phone verification above remains valid (presentation unchanged by email work). Full app build result recorded below.

References: https://resend.com/docs/dashboard/emails/idempotency-keys ; https://supabase.com/docs/guides/functions/auth ; installed Next after documentation. Current Supabase changelog checked; no relevant runtime-breaking change for the existing service-role authentication pattern.

Final verification: full production webpack build including strict application TypeScript and155 generated pages passed using local fixture credentials only. Candidate is ready for release review; production and mail service remain unchanged. No external email was sent; real provider acceptance/delivery remains an authorized-release verification step.

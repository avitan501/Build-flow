# Native consultation booking — October 29, 2026

User explicitly authorized replacing the second Google booking screen, connecting the business calendar, testing and publishing. Codex is sole editor/publisher in `codex/consultation-polish-preview-20261029`, based on live `0e8ada363b17a5d8cb5b41ffffe9e32f6c32ba50`.

## Final behavior

The approved compact cream consultation page has one date/time selector followed by name/email. Times use America/New_York, including DST, the existing weekday schedule, four-hour notice and a 55-day horizon. Both availability and booking consult live business-calendar free/busy. A confirmed booking creates a 15-minute Google Meet event on buildavantiap@gmail.com and requests an invitation to the client. The optional material questionnaire appears only after successful booking.

Private database reservations serialize competing website claims. Deterministic Google event IDs prevent repeat invitations on retries; uncertain outcomes retain the reservation. The page locks details during an uncertain outcome and offers a retry. Confirmed cancellations in Google release website reservations when availability is checked. All reservation table/RPC access is denied to anonymous and ordinary authenticated clients. Stored data is limited to slot, status, request ID, content hash and daily pseudonymous abuse bucket; no client name/email is stored in this table.

## External configuration

Dedicated Google project `tensile-axiom-513116-b9`, OAuth client Avantia server booking. Owner completed all policy/consent screens. Audience is In production; renewed offline grant returned no testing expiry. Permissions: calendar events, free/busy, calendar identity. Credentials remain private and three dedicated sensitive production variables are configured in the existing Vercel project/team. No billing or paid trial enabled.

Live `/api/release` independently confirmed Supabase ref `nprfhspwdflpqlopydmp` before migration. Applied `20261029163255_consultation_booking_reservations.sql` through the owner-authenticated SQL editor and recorded migration history. RLS true; anon and authenticated SELECT false; anon RPC EXECUTE false. Unrelated tables and existing Google events preserved.

## Verification

- Eight API/unit cases: input/origin rejection, dates/DST, idempotency, reservation conflicts, rate limits, busy slots, uncertain failures, safe Meet links, cancellation reconciliation and fail-closed availability.
- Existing questionnaire/release unit suite: 20 passed.
- Eight existing calendar/DST checks and six native-flow browser cases passed across desktop Chromium and phone WebKit. No iframe, no overflow; questionnaire hidden until success; same request ID/body on retry; outage disables booking. Screenshots saved here and inspected.
- Production database integration: simultaneous distinct IDs for one slot yield exactly reserved/conflict, repeat ID yields duplicate, anonymous read/RPC rejected; synthetic reservations removed.
- Real local API integration against production services: one owner-only test booking for November30, Google Meet generated, correct business organizer and owner attendee, 15-minute duration, confirmed reservation, repeated request returns same booking, occupied time removed. Test event and reservation removed; invitation and cancellation requested only to avitanneto@gmail.com. Email delivery itself not yet independently established.
- Production build and final live verification: pending at time of this report; see release completion below.

## Operational limits

Google/DB failures fail closed. An ambiguous pending claim is intentionally held for safe retry; an abandoned ambiguous claim requires owner investigation before release. No recurring jobs or monitoring created. Fixed weekly windows remain in `lib/consultation-calendar.ts`; Google free/busy further narrows them. Concurrency is serialized for this website, while external calendar edits are checked immediately before insertion rather than being transactionally locked with Google.

The existing Supabase dashboard shows a quota/grace-period warning. No billing settings were changed; availability and booking integration currently work.

Release preparation: full webpack production build passed, including TypeScript and155 generated pages. Eight booking unit cases passed after cancellation reconciliation. Production domain, project/team and three dedicated production credential variable names verified; both remote mains still equal0e8ada36 and no deployment is active. Existing homepage/questionnaire runtime files are unchanged from the approved live base.

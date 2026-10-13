# Website booking links and hourly availability — 2026-10-13

## Outcome

David requested the existing booking link on the website and WhatsApp template, with fewer calendar choices. He selected one start time per hour. Homepage version 2 now leads to the branded consultation page; the Google calendar is updated live. The website code remains local and unpublished.

Public booking URL (unchanged):
https://calendar.google.com/calendar/appointments/schedules/AcZssZ1V5EbiUaZkRkYM297ilnfyJdHagNcuwLz6nqWtA5Rmu7NvfJracZxVrIPACP8txGy0LtJpAyTb

## Calendar change

- Same appointment schedule on David's `avitanneto@gmail.com` primary calendar.
- Monday–Thursday starts: noon, 1, 2, 3 and 4 PM.
- Friday starts: noon, 1 and 2 PM.
- All times `America/New_York`; each meeting remains 15 minutes.
- Implemented as 15-minute weekly availability windows on the hour; times between windows are not offered.
- No invented appointments, fake bookings, or claims that restricted times are already booked.
- Google Meet, primary-calendar conflict checking, required name/email, four-hour notice and existing confirmations/reminders retained. Saturday/Sunday availability unchanged.
- Save confirmation observed. Public Monday and Friday hourly choices verified anonymously. No booking submitted or message sent.

## Website and template

- New worktree: `/root/avantia-consultation-links-20261013`.
- Branch: `codex/consultation-links-20261013`, baseline `3ed4ddbcb518c93f43b60da88b7cd1247148e24b`.
- Shared public booking URL and route: `lib/consultation.ts`.
- Homepage version 2 uses the approved pain-first consultation direction, one hero action (“Schedule a Meeting”), no helper line below the action, and five main content links to `/consultation`.
- The site menu also includes “Schedule a Meeting.” Existing shopping/request routes remain available.
- Consultation page shows the precise hourly starts and embeds the same Google calendar.
- WhatsApp text: `docs/consultation-booking/whatsapp-message.txt`, with the real booking URL and a free 15-minute consultation. Draft only; no send.
- Earlier approved local chat and footer changes integrated unchanged from `/root/avantia-local-preview-20261011`: `public-contact-bar.tsx`, `avantia-build-lockup.tsx`, `site-footer.tsx`. The source checkout remains intact.
- Preview: `http://localhost:3003/`; booking route `http://localhost:3003/consultation`. Port3001 still serves the earlier isolated booking-page checkout; port3002 was occupied and left alone.

## Verification

- Changed-file ESLint and `git diff --check` passed.
- `next typegen` followed by `tsc --noEmit --incremental false` passed. Initial typecheck before route generation lacked the generated `RouteContext` type; no application change was needed to resolve it.
- Homepage HTTP200, five content booking links, internal navigation and real embedded booking form passed.
- Desktop 1440px and phone 390px inspected with no horizontal overflow; phone hero contrast adjusted for readable copy.
- Collapsible chat opens/closes. Footer uses a loaded, unfiltered GIF.
- Anonymous Monday October19 slots: noon, 1, 2, 3, 4 PM. Embedded Friday October16 slots: noon, 1, 2 PM. Friday's 2PM choice opens a 2–2:15PM form with Google Meet.
- Browser smoke checks passed with no JavaScript errors. No form submitted. Local non-GET API calls were blocked during tests.
- Screenshots in `evidence/`. No production build/release performed; normal release checks still required before publishing.

## Remaining release step

The Google calendar is live and shareable now. The Avantia website changes await an authorized production release using the existing approved hook. Reconfirm the current production baseline and ownership before release. Root repository dirty changes were preserved. Codex is the only assistant; no active production publisher.

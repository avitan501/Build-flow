# Consultation release — 2026-10-13

## Status and authorization

David explicitly authorized deployment to https://avantiabuild.com. After Google could not find an account for office@avantiabuild.com, David chose option2: use the existing **buildavantiap@gmail.com** business Google account. No new account, credentials or billing changes were needed. Codex is the sole designated publisher.

- Worktree: `/root/avantia-consultation-release-20261013`.
- Branch: `codex/consultation-release-20261013`.
- Baseline: `245c05f286e5d082f95cc2d51e3a89b6e448c46a`, including approved homepage, chat and footer changes.
- Current stage: business calendar saved; final production build, anonymous calendar, and desktop/phone website checks passed. Ready for the already-authorized production release; exact SHA and deployment result will be recorded in the shared master context.

## Business booking calendar

Public URL: https://calendar.google.com/calendar/appointments/schedules/AcZssZ37unU4FOaHd0UDjU3GI4WM4-swkF3hW_f9KTf5Bztx-ZeJO60Rq_5POmlv9oAv0ElWVP-JRqkV

- Owner: `buildavantiap@gmail.com`; Google display name: `build avantia`.
- Title: Avantia — Free Construction Concierge Consultation.
- Free, 15 minutes; automatic Google Meet video link after a real booking.
- America/New_York timezone; repeat weekly.
- Monday: 12, 2, 3, 4 PM.
- Tuesday: 12, 1, 2, 4 PM.
- Wednesday: 12, 1, 2, 3 PM.
- Thursday: 12, 2, 4 PM.
- Friday: 12, 2 PM.
- Weekends unavailable. Each start has a 15-minute availability window.
- Genuine limited availability, not fabricated bookings or labels claiming demand.
- Business primary-calendar conflict checking is enabled. Personal calendars are not checked automatically.
- 60-day booking window, 4-hour minimum notice; first/last name and email required.
- Google calendar invitations and confirmation emails enabled. No paid reminder features enabled.
- Existing personal schedule left intact; no appointments deleted or cancellations sent. The website and current WhatsApp draft now use only the business schedule.

## Website and invitation

- `lib/consultation.ts`: business public schedule for embedded booking and new-tab fallback.
- `docs/consultation-booking/whatsapp-message.txt`: same business schedule in the approved pain-first invitation. No message sent.
- Homepage version2 and main booking actions lead to `/consultation`.
- Booking page states the consultation hours and asks visitors to choose from actual available times.
- Approved collapsible right-side chat and colorful animated footer remain included.

## Verification

- Public anonymous calendar shows the business identity, Google Meet and 15-minute appointments.
- All five weekday slot lists matched the configured times; Saturday and Sunday empty.
- Appointment form opens without Google login and shows 12:00–12:15pm, New York and Google Meet. No booking was submitted.
- Evidence: `evidence/business-calendar-check.json`, `evidence/business-calendar-desktop.png`.
- Changed-file ESLint and diff checks passed.
- Integrated baseline previously passed a production webpack build, TypeScript, 10 deployment-guard checks, 20 desktop/phone homepage/contact scenarios and 23 release regressions. One cold-route timeout passed its targeted retry. SMS submissions were mocked.
- Final business-calendar candidate production webpack build passed, including TypeScript. Desktop1440px and phone390px checks passed: all five main homepage booking actions lead to /consultation; the correct business calendar and fallback load; Monday slots match; booking form opens with Google Meet; no horizontal overflow; footer GIF is loaded without a color filter; right-side chat icon visible. Screenshots visually checked. No booking submitted.

## Release routing and remaining work

- Production domain: `avantiabuild.com`.
- Vercel project: `prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE` / `build-flow-wfl3`.
- Team: `team_ppEl8INgejzz6LoMr6UhXnfs` / `avitanneto-1804s-projects`.
- Production Supabase: `nprfhspwdflpqlopydmp`; no production data or environment mutation.
- Approved existing hook: Avantia primary production, ID `U8IJX9nbyf`, main, bound to `avitan501/Build-flow`. Hook URL stays secret.
- Canonical `AV-Design-and-Build-Org/avantia-build` and mirror main both remain `df745dbc96d8fefcbd123fa301a36f5ce0d805d1` at preflight. Latest Vercel deployment is READY, no other active publisher recorded.
- Commit the tested candidate, recheck bindings and no active release, fast-forward both mains, run the production guard, trigger the approved hook once, and verify exact live SHA plus affected live behavior.
- Existing authenticated noVNC Chrome provides Vercel access; CLI token is expired. GitHub credential helper works. No credential changes or alternative deployment route.
- Root dirty changes and other previews preserved. Existing deployment authorization persists.

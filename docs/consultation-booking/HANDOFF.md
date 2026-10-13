# Avantia consultation booking — 2026-10-13

Follow-up: [hourly availability and website integration](../consultation-links/HANDOFF.md) supersedes the original open-hours display and integration status below. Current starts are hourly, with 15-minute meetings.

## Outcome

David requested a real consultation booking calendar. The Google Calendar appointment schedule is saved and publicly accessible. A branded `/consultation` page embeds it and is ready locally; the Avantia website has not been deployed.

Public booking link:
https://calendar.google.com/calendar/appointments/schedules/AcZssZ1V5EbiUaZkRkYM297ilnfyJdHagNcuwLz6nqWtA5Rmu7NvfJracZxVrIPACP8txGy0LtJpAyTb

## Confirmed configuration

- Owner/calendar: David Avitan, `avitanneto@gmail.com` primary calendar.
- Title: Avantia — Free Construction Concierge Consultation.
- Duration: 15 minutes, free.
- Monday–Thursday: noon–5 PM. Friday: noon–3 PM. Saturday/Sunday unavailable.
- Schedule timezone: `America/New_York`. The account timezone was not changed.
- Location: Google Meet, with a video link generated after booking.
- Primary-calendar availability checking enabled; busy times are configured to be excluded.
- Required booking fields: first name, last name, email.
- Confirmation/calendar invitation and one-day email reminder enabled.
- Existing defaults retained: 60-day booking window, four-hour minimum notice, no buffer or daily cap.

## Implementation and ownership

- One assistant: Codex. No agents or parallel release.
- Worktree: `/root/avantia-consultation-booking-20261013`.
- Branch: `codex/consultation-booking-20261013`.
- Baseline: `df745dbc96d8fefcbd123fa301a36f5ce0d805d1`.
- New files: `app/consultation/page.tsx`, `app/consultation/consultation.module.css`.
- Existing-file changes: full-width shell and simplified header for `/consultation` only in `components/buildflow/buildflow-client-shell.tsx` and `components/buildflow/mobile-client-header.tsx`.
- Page uses the real public booking URL, embedded calendar, and a new-tab fallback.
- Main action: “Schedule a Meeting.” No separate business database or API is required.
- Local preview: `http://localhost:3001/consultation`.

## Verification

- Changed TSX files passed ESLint; TypeScript `--noEmit --incremental false` passed.
- Local route compiled and rendered successfully; no JavaScript errors in a fresh browser run.
- Desktop 1440px and phone 390px inspected; no horizontal overflow.
- Anonymous public booking page opened without a Google login.
- Friday October 16 showed noon through 2:45 PM starts, ending at 3 PM.
- Public and embedded phone calendars reached the contact form for a selected slot. The form states that Google Meet information is added after booking.
- No appointment submitted. No confirmation, invitation, or outbound message sent by this task.
- Busy-calendar checking was inspected in configuration; no synthetic busy event was created to test conflicts.
- No production build or Avantia deployment performed. Production release checks remain required.
- Screenshots: `evidence/desktop.png`, `evidence/phone.png`, `evidence/booking-form-phone.png`.

## Next integration step

Publish the branded route and connect the homepage action only when a website release is authorized. Preserve the earlier approved, uncommitted homepage changes in `/root/avantia-local-preview-20261011` (right-side collapsible chat and full-color animated footer logo). Those changes are not included in this calendar branch and must be integrated before release. The root `/root/buildflow-supply` dirty changes were preserved.

Public Google booking can be shared immediately. `whatsapp-message.txt` supplies the approved message with its calendar placeholder replaced; it has not been sent.

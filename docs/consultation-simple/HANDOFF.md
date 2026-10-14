# Simple two-week booking — 2026-10-14

Requested live page: https://avantiabuild.com/consultation. Codex sole publisher, separate worktree `/root/avantia-consultation-simple-20261014`, branch `codex/consultation-simple-20261014`. Baseline `86fec23b89f0bd4cbebc7c2ca5dfc3bedc87ee6a` (latest live/both mains). No overlapping release or calendar owner recorded; unrelated root changes preserved.

## Delivered behavior

- Minimal meeting title and duration, 14 consecutive day buttons, time choices, small policy footer. Long pitch, side panel, redundant scheduling CTA and contact footer removed on this page only.
- Two-week paging, starting from the current New York day. Weekends visible but disabled. Four pages cover 56 days within Google's existing 60-day booking window.
- Hourly choices noon through 4 PM inclusive, US AM/PM, America/New_York with DST handled. 15-minute Google Meet, four-hour notice.
- Gray disabled slots mean Unavailable, not fictional customer bookings. Weekly schedule has 17 open /25 possible weekday starts (32% blocked, approximately requested30%).
- Selecting a time opens the existing business Google appointment form with date/time preselected. English and New York are passed explicitly, independent of visitor timezone. No Google iframe is loaded before choosing a time. Change day/time and a direct new-tab fallback remain available.
- Metadata and header use the approved “strategy meeting” wording and Avantia branding.

## Availability boundary — do not overstate

The custom picker represents **configured booking hours, not live free/busy**. Its visible note says Google confirms availability after selection. Google validates the chosen slot when opening the form and at submission; a closed slot was independently observed returning “The selected time is no longer available.” No simulated booking success or new appointment API was implemented. Actual bookings can make additional slots unavailable at the Google step. Google controls its final form and any fallback calendar shown after cancellation/unavailability.

Google's embedded widget has no supported setting for the requested custom two-week layout. Its existing date/slot deep links were verified anonymously on desktop and mobile. If Google changes those URL parameters, the underlying public booking URL remains functional; recheck the form handoff. No private/undocumented Google RPC is called by application code, no keys copied, no credentials or permissions added. Public availability was inspected through Google's own browser page only.

Maintain `lib/consultation-calendar.ts` alongside any future changes to the Google weekly schedule. A fully synchronized custom picker would require an authorized calendar API integration; the current website has no configured calendar OAuth credentials. Do not silently advertise these schedule windows as a real-time availability feed.

## Authorized Google Calendar edit

Existing business account `buildavantiap@gmail.com` independently verified before editing. Same public schedule token and owner preserved.

- Monday:12,2,3,4 PM; Tuesday:12,1,2,4 PM.
- Wednesday:12,1,3 PM; Thursday:12,2,4 PM; Friday:12,2,4 PM.
- Wednesday2 PM removed; Friday4 PM added. Weekends off. Other windows unchanged.
- Title: “Avantia — Free 15-Minute Strategy Meeting”. Description shortened to one paragraph.
- Google Meet, conflict checking, first/last name and email,60-day horizon,4-hour notice unchanged. Existing bookings untouched. No test appointment, email, WhatsApp, invitation or cancellation sent.
- Save confirmation observed and all weekday windows verified anonymously (`evidence/google-schedule.json`).

## Verification

- Four focused tests cover 14-day/month boundaries, New York date, both DST transitions, notice, weekends, blocked ratio and exact Google form URL.
- Desktop1440, phone390 in Jerusalem timezone, narrow320 in Los Angeles timezone:14 day buttons, forward/back two weeks, noon–4PM, gray disabled times, no horizontal overflow. Google form at4PM/15min/NewYork/Meet verified on desktop and phone, back/focus restored. No submission.
- Changed-file lint and diff checks passed. Ten deployment guard tests passed (mocked hook).
- Full production webpack build and TypeScript passed (154 static pages; consultation remains dynamic so dates are fresh). Eight existing optional-service/auth-shell regressions passed. One pre-existing homepage-performance static assertion fails because it expects a literal logo src while the approved GIF change uses a conditional src; exact logo source is unchanged from baseline and the assertion also fails there. No test weakened or unrelated source changed. Final release details are recorded in the root master/context handoff.

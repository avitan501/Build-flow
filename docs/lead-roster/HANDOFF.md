# Lead contacts inside the outreach task

David asked to see every lead name and callable contact when opening “Your next client starts with hello” on the private owner dashboard.

## Implementation

- Existing task key `david-lead-outreach-20261014` opens a contact roster before the task editor. No new task or duplicate contact records.
- Each open reads the current `manager_outreach_leads` rows using the existing owner + board-unlock checks and the signed-in Supabase client. All result pages are fetched; a failed page produces a retry state instead of an incomplete success list.
- Names, company, normalized phone, a native Call link, saved status, Spanish preference, and expandable original notes. Missing/invalid phone numbers are labeled; email-only contacts remain visible. Search supports name, company, email and phone formatting. Open contact reaches the existing lead directory with the appropriate department and search.
- Explicitly internal test leads are excluded by the saved “internal test lead/contact” marker. No saved records, statuses, notes, communications or bookings are changed on opening/searching the roster.
- Read-only list is mounted only for this task. Closing clears it; reopening fetches fresh data. Original task edit/save/complete/delete/share controls remain. Existing task summary remains unchanged under Edit task details.
- The task retains a short, optional conversation starter. Contact notes remain source data rather than inferred live follow-up status.

## Scope and release

Worktree `/root/avantia-lead-roster-20261014`, branch `codex/lead-roster-20261014`, based on live `92e8ae67996b25e6db9882c915a721da677c5d3c`. Codex only; main workspace dirty changes preserved. Deployment uses the existing approved production hook after checks.

Production audit before implementation: 25 lead rows, 24 real contacts, 23 valid phones, one email-only contact. No private contact list is committed with this report.

## Verification

- Focused unit checks cover complete pagination, exclusion, email-only leads, empty/error handling, phone normalization, search and directory routing.
- Existing task-action tests also deny roster reads to staff and locked owners before any data query.
- Isolated local HTTP fixture exercises task CRUD and the new roster UI without production business writes. Browser checks cover full list, search, notes, repeated opens/fresh data, retry, phone and desktop layout, and existing motion/task interactions.
- Passed: 8 focused/action checks; 8 existing dashboard browser regressions; 4 new roster scenarios across Chromium and mobile Safari; 10 release-guard checks; ESLint, diff checks and full production webpack build/TypeScript (154 pages). Desktop and 390/320px phone screenshots inspected. The initial retry-fixture failure was corrected to simulate a sustained outage rather than a single read consumed by development-mode duplicate effects; all final checks passed.
- Exact live SHA and authenticated production inspection follow the approved hook release and are recorded in the shared handoff below.

Final release results are recorded in `/root/buildflow-supply/docs/lead-roster-20261014/HANDOFF.md` and the Website section of the focus index. No external messages or calls are sent by this task.

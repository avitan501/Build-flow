# Live request and payroll follow-up — 2026-09-15 UTC

## Already published and verified

- Core `b671a247`: workflow34912105498 success; Vercel
  `dpl_BnDiMLrZdJUWeRjQgLe3FcqWbPDn` READY on avantiabuild.com.
- Payroll `4c79045e`: workflow34912833835 success; Vercel
  `dpl_D6WgxzuajixUP9mhr9Jv1oWNt2Gg` READY. Exact release/ref checked.
- Production Supabase remains `nprfhspwdflpqlopydmp`.
- Payroll migration `20260915002021` installed. No real hours, paid markers,
  payment requests or payments changed. Eight legacy paid markers preserved.
- Actor-permission repair migration `20260915002825` installed (source
  20260915002415, SHA256
  `03699d61318c98e70f2c67764b285b99c0cadb0136a0ac753d680a805957a835`).
  Nine business RPCs remain INVOKER. Only a label-returning, service-only helper
  reads identity. No auth.users SELECT or private-schema USAGE grants added.

## Actual live verification

Existing Carlos Chrome session only; owner login not switched.
390/1440 request list, all three step dialogs, compact overview + Activity and
communications passed: no horizontal overflow or page errors. Local fixture
preview endpoint returns404 in production.

Dedicated contactless QA request638412 (`ebc5830c-fc75-46fb-9814-6c9a46e06f0a`)
and comparison `5195039c-6288-4315-9b93-7fd9286d6301` contain only synthetic data.
Private note autosave/reload/restore passed. Product A and B chose different
suppliers, persisted after reload, then cleared back to the empty draft.

Live organized-item editing first exposed an actual missing identity-read
permission. The original value was protected; the narrow migration fixed it.
Subsequent quantity2→4 save/reload, restore2 and Undo/reload passed. Two-page
concurrency also passed: stale4 rejected while saved3 remained; explicit conflict
preserved the stale draft. Test values restored2 afterward.

Carlos payroll 390/1440: rate/break exclusion, available records,16 day checkboxes,
request button and no Paid/Unpaid controls; no overflow/errors. Database owner,
Carlos and unknown-actor authorization checks passed without financial writes.
Actual owner UI and real clock/payment transitions were not clicked.

The deployed send Edge rejected a zero-ID/missing-claim probe with400
invalid_or_changed_quote_claim. No recipient/PDF was supplied, no email sent.

Evidence files: /tmp/avantia-production-after-core-20260915/report.json,
/tmp/avantia-live-qa-results-20260915.md,
/tmp/avantia-live-organized-retest-report-20260915.json,
/tmp/avantia-live-concurrent-item-report-20260915.json,
/tmp/avantia-payroll-live-readonly-report-20260915.json.

## Current application follow-up candidate

Base4c79045e; actor repair source integrated as a8200f4e and queued-only app
safeguard as811ecea5. Only two runtime files changed after payroll. Failed enqueue
now reports failure instead of invoking AI without a durable job. This does not
claim to repair the62-row PDF extraction or deploy chunk checkpoints/worker.
Full webpack build153, standalone TypeScript,18 durable regressions,6 executable
helper/action tests,10 release guards and scoped lint passed. Final serialized
publication and live verification remain required for this follow-up.

Full resumable AI package, real-source coverage, sitewide autosave beyond these
tested forms, full partial-invoicing/delivery ledger and permanent Meet
configuration are not certified complete by this release.

# Client questionnaire — published October 19, 2026

David explicitly authorized deployment after approving the preview. Codex was the sole publisher. Exact application/live commit: `f9c523b19e8bb33bf15d674923e94e91da8cc592`, on `codex/client-questionnaire-20261019` in `/root/avantia-client-questionnaire-20261019`. Both canonical `AV-Design-and-Build-Org/avantia-build` and hook-bound `avitan501/Build-flow` main were advanced normally from live baseline `a609cb8be7f05d27530f401adcf544f88de9c483` to the tested candidate.

- Public client questionnaire: https://avantiabuild.com/questionnaire
- Private owner response inbox: https://avantiabuild.com/owner/service-planner/client-responses
- Original owner-led questionnaire remains at https://avantiabuild.com/owner/service-planner/interviews and has zero source diff against baseline.

## Release route and storage

Independently verified live domain, Vercel project `prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE`, team `team_ppEl8INgejzz6LoMr6UhXnfs`, Git binding and approved existing `Avantia primary production` hook `U8IJX9nbyf` on main. No concurrent release was active. Triggered the hook exactly once. Deployment `dpl_HCff8w1kLcNGDoRZugij2YPgurEs` reached READY. The live `/api/release` endpoint returned the exact tested SHA and production Supabase ref `nprfhspwdflpqlopydmp`.

Two reviewed additive migrations were applied only to that independently verified production project:

| Migration | Source version | Applied history version |
| --- | --- | --- |
| add_client_questionnaire_submissions | 20261019171237 | 20261019193514 |
| add_client_questionnaire_followup | 20261019185909 | 20261019193517 |

The migration tool recorded application-time versions; SQL matches the source migration files. Existing data and original interviews were not altered. Both tables have RLS enabled, with no anonymous or authenticated-role privileges. Server role can read/insert submissions but cannot update/delete originals; it can read/insert/update optional follow-up details but cannot delete. The submission RPC is security invoker with an empty search path, callable only by the server role. Optional details require the scoped expiring capability.

Security advisor reported the expected informational [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) notice for these private server-only tables. Public/member grants are explicitly revoked; absence of client policies is intentional. No new questionnaire warning/error findings were reported. Existing unrelated findings were left unchanged.

## Verification

- Full Next production build, TypeScript, targeted ESLint and diff checks passed on the exact candidate. Existing preferredRegion deprecation and Sentry release-upload configuration warnings were non-blocking; no settings were changed.
- 28 local API/schema/real PostgreSQL/original interview/release-guard checks passed.
- 16 browser scenarios passed on the final production build across Chromium desktop and WebKit phone, including actual isolated PostgreSQL persistence and owner inbox, retries/failures, contact validation, exclusivity, multi-select Done, Other, refresh, consent and after-submit details.
- Desktop/phone screenshots inspected before and after publication. Live pages returned200, no JavaScript errors or horizontal overflow, approved copy/product choices present. No HVAC or foundations category, and no declined availability-check choice.
- One clearly labeled synthetic live response verified actual public submission, optional post-submit location/timing, confirmation after refresh, authenticated owner API/inbox detail, and original questionnaire availability. Anonymous inbox access returned403. No customer/supplier communication was sent.
- The exact synthetic response and its details were removed afterward using both its unique receipt and synthetic profile markers; absence was confirmed. No real client records were touched.
- Live screenshots and sanitized results are in `release/`. Synthetic test contact data only.

## Current state

Production is live and verified. The local preview remains on3110 with local fixture3119; release-only test services3120/3129 are stopped. No credentials, deploy-hook URLs or capabilities were written to this report. Release evidence is committed separately from the already deployed application commit; do not mistake a later docs-only HEAD for the live SHA.

David deferred Foundations/concrete and declined the proposed availability/date-check service; both remain absent. Original owner questionnaire and the earlier all-departments prototype remain separate. Next: share the public questionnaire link and review responses in the private inbox. No outstanding release work.

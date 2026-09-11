# Material-list processing timeout hotfix

Website release 9ce50cdd is live on avantiabuild.com (owner-release run34555807721 succeeded). Request638408 still had zero organized products: job27 generation8 reported organizer_timeout, and source metadata independently recorded openai_timeout. The former45s worker budget expired before the former30s provider invocation completed its full preparation/provider path.

This narrow follow-up preserves the existing model and Vault key, aligns provider90s / worker120s / cron dispatch135s, and bounds the key lookup at8s with5s connection timeout and idle cleanup. Safe failure codes only; no credential copying. The SQL migration verifies the installed55s timeout before changing just that expression, preserving function body and grants.

Verification: Deno checks both Edge Functions passed (`--node-modules-dir=none`);44 targeted source/behavioral tests passed; scoped ESLint and whitespace review passed. Initial test runner server startup failed because the separate worktree symlink falls outside Turbopack root; reran static tests with webServer disabled. A stale UI-copy assertion was updated to the already-released concise labels. No browser was launched by these tests. Generated Deno lockfile removed; no user files removed.

Production actions: aligned-timeout migration applied, worker v3 and organizer v21 ACTIVE on independently verified project nprfhspwdflpqlopydmp. Existing JWT settings retained (worker custom authorization, organizer JWT). The existing retry schedule will pick up the new implementation; no second requeue or supplier/order messaging.

Pending: confirm actual successful products for638408 and compare extraction to source; authenticated browser verification requires user to sign into the existing noVNC session. Do not equate deployment with successful parsing.

## Extraction fidelity follow-up

Attempt4 completed at02:58UTC, but comparison to the source revealed a second bug: semantic merging ignored structured length/section attributes, then downstream quantity grounding retained only the first quantity.17 products were therefore NOT a correct final result. Example: eight TJI lengths/quantities collapsed into one35-piece row. User informed not to quote from this interim result.

Organizer v22 now opts into conservative source-row preservation: distinct source lines are not summed before grounding; duplicate evidence only deduplicates when structured attributes agree. Prompt explicitly preserves lengths and section headings. Explicit bare plywood fractions (5/8,3/4) survive thickness verification instead of becoming needless missing-field warnings.73 targeted tests, Deno check and scoped ESLint/whitespace passed. No website UI change in this follow-up.

Before reorganization, read-only checks found17 generated rows with no manual-edit/supplier markers and zero comparison/attachment links. Existing force-enqueue RPC used only for638408 to replace our just-generated incorrect rows; original typed list and PDF are retained. No supplier or customer communication was sent. Actual final extraction verification still pending.

## Final production result

Generation9 attempt2 completed03:06:34UTC:39 separate products. SQL multiset comparison against all39 original source lines found zero missing lines and zero quantity mismatches; sections and individual lengths inspected. The17 incorrect interim generated rows were replaced by the existing organizer workflow; their temporary do-not-price warnings no longer apply. Original source/PDF retained; recoverable by reorganization, not by restoring the deleted generated IDs.

Final width check found the thickness validator discarded explicit mixed-fraction LVL cross sections. Added regression coverage for1-3/4x10 and1-3/4x11-1/4 while continuing to reject unspecified widths. Deno/ESLint and29 normalization/merge tests passed; organizer v23 ACTIVE. Five newly generated LVL rows had their explicitly sourced1-3/4-inch thickness restored with a guarded update (request-only, empty thickness, exact source pattern, no manually edited rows). No inferred dimensions or quantities added. Remaining genuine missing fields include unspecified lumber type and plywood sheet dimensions.

Authenticated production UI remains unverified until user signs into existing noVNC Chrome; public live390/1440 checks and prior local staff mobile/desktop checks passed. Large lists may still need automatic retries (this39-row pass took about87seconds); longer-running extraction architecture is remaining work, not claimed solved by this deadline adjustment. Website release stays9ce50cdd; preserve these Edge-only follow-up commits before future releases.

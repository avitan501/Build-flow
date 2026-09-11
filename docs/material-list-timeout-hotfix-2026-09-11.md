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

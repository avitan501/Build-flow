# Material-list processing timeout hotfix

Website release 9ce50cdd is live on avantiabuild.com (owner-release run34555807721 succeeded). Request638408 still had zero organized products: job27 generation8 reported organizer_timeout, and source metadata independently recorded openai_timeout. The former45s worker budget expired before the former30s provider invocation completed its full preparation/provider path.

This narrow follow-up preserves the existing model and Vault key, aligns provider90s / worker120s / cron dispatch135s, and bounds the key lookup at8s with5s connection timeout and idle cleanup. Safe failure codes only; no credential copying. The SQL migration verifies the installed55s timeout before changing just that expression, preserving function body and grants.

Verification: Deno checks both Edge Functions passed (`--node-modules-dir=none`);44 targeted source/behavioral tests passed; scoped ESLint and whitespace review passed. Initial test runner server startup failed because the separate worktree symlink falls outside Turbopack root; reran static tests with webServer disabled. A stale UI-copy assertion was updated to the already-released concise labels. No browser was launched by these tests. Generated Deno lockfile removed; no user files removed.

Production actions: aligned-timeout migration applied, worker v3 and organizer v21 ACTIVE on independently verified project nprfhspwdflpqlopydmp. Existing JWT settings retained (worker custom authorization, organizer JWT). The existing retry schedule will pick up the new implementation; no second requeue or supplier/order messaging.

Pending: confirm actual successful products for638408 and compare extraction to source; authenticated browser verification requires user to sign into the existing noVNC session. Do not equate deployment with successful parsing.

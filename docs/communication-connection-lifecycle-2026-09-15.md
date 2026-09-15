# Bounded communication connection lifecycle

Base 19ca5fac. Fresh read-only get_edge_function verified production broker192 and outbox6 before editing; both entrypoints and every fetched relative dependency match the base repository (ignoring trailing newline).

Only production changes: idle_timeout5 and max_lifetime60 in the broker main client, broker independent fast-poll control client, and outbox client. max1, preparefalse, separate clients, auth, providers, polling, leases and message behavior are unchanged. No database/schema/provider/production mutation performed.

Verification:

- Two node executable constructor tests pass; mock execution proves all three exact option sets. Removing the six added lines reconstructs baseline source byte-for-byte.
- Full Deno check attempted for both endpoints. It fails with 97 pre-existing diagnostics (implicit anys, existing WebCrypto types, EdgeRuntime globals and others). Unchanged live-source and candidate were independently checked; sorted diagnostic code/message sets are identical (97). This is NOT a claim of clean full type checking.
- Deployment closure payload files all match candidate source, including every fetched shared dependency. Existing JWT false preserved for both. No dependency upgrades, import changes or secrets copied.
- Pinned Postgres.js v3.4.5 source verifies timers call end(), which defers termination while a query or reservation is active; this is not a statement timeout. https://github.com/porsager/postgres/blob/v3.4.5/src/connection.js#L398

Deployment payloads for root only:

- /tmp/avantia-connection-deploy-aura-messaging-broker-20260915.json; SHA256 0a109f66a240dcd1ea1c8a9bb3127586d8ecfa95729f0cabbb2f0c52dc78f867
- /tmp/avantia-connection-deploy-aura-communication-outbox-worker-20260915.json; SHA256 b0dd98b86a3ec88f1d294327f927b6557f99a68939194f7ecbf2499fe8dfa209

Before deployment root must recheck that live versions/sources remain192/6, verify production binding and serialize deployment. Afterwards compare downloaded source, check read-only idle connection counts and 53300 errors. This patch reduces idle retention; it does not prove all connection pressure or all communication workflows are fixed. No live message should be sent as a diagnostic without scoped approval.

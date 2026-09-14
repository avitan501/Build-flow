# Original-source edit concurrency — Maya

Base64ceec7a; isolated worktree `/tmp/avantia-original-source-cas-20260914`, branch `codex/original-source-cas-20260914`.

The original editor captures its displayed item snapshot when opened and supplies it on save. Server reads verify every snapshot field before composing a patch. The existing service-only `staff_apply_request_item_edit` locks the original and checks the full snapshot atomically again. This avoids putting20k raw-source JSON into query-string CAS filters and requires no new migration. Its private receipt is internal; original edits do NOT advertise Undo or autosave.

Removed automatic quantity/unit synchronization into the sole organized child. Linked originals get `draft_changed` and require explicit review; existing organized metadata, verified quantities, routes and prices are untouched. Failed snapshot/read/RPC checks return not-saved/conflict and leave the editor draft open. Multiline raw text retains its20k limit and user-defined fields.

Verification:28 focused action/normalization checks passed. Executable action mocks cover stale displayed source, absent snapshot, write-time race, failure preservation,20k multiline/custom fields, source-file metadata preservation and no blind update/child edits. Scoped ESLint and diff checks passed. Disposable local PostgreSQL16 applied existing receipt migration: original save, stale rejection,20k source persistence and unchanged reviewed child passed. Two actual concurrent RPC calls sharing one expected snapshot yielded exactly one success and one conflict. No production edits, live source extraction, customer communications, deployment or new migration.

`next typegen` and standalone `tsc --noEmit --incremental false` passed. Integration overlaps Noam's large actions file only around the original-save function and new import; preserve his changes elsewhere. Full combined build and authenticated browser persistence remain root release gates. This does not fix unrelated legacy organized-item actions or add automatic original draft saving.

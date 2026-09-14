# Request source-attachment edit fence — candidate, not deployed

Base: coordinated `7a2483cc`. Isolated worktree `/tmp/avantia-request-source-attachment-fence-20260914`.

## Scope and behavior

An added, changed, removed or reclassified client/internal request attachment now changes the exact request-item snapshot used by organized edits and Undo. A trigger locks request items in deterministic request/item order and adds one reserved `metadata.source_file_change` object: unique revision, event and sanitized filename capped at240 characters. It does not replace product fields, re-extract AI results, change qualification/status, or write private notes to customer events. Source-less organized products are included; unrelated requests and supplier-only files are not.

The existing safe-edit RPC uses the same ordered item/source locks and exact before/after snapshots. Thus an upload committed before an edit causes stale CAS rejection; an upload after a saved edit prevents its old Undo. An upload that commits between successful edit and action readback returns an explicit conflict notice explaining that the edit was saved before the source update, rather than silently claiming the new file was reviewed.

The current conflict panel names the changed file and explicitly says products have not been re-extracted. Refresh/current server props or a save attempt detects another worker's update; this does not add realtime subscriptions/polling or automatic PDF replacement. Grouping/original-only legacy editors are not converted into this organized-edit/Undo contract.

## Migration approval manifest

`20260914225145_request_source_attachment_fence.sql`

SHA256: `10f241b372b0a644bda4a03bf89c9fb807f2496aff930e9a8116a496d17da6ca`

Generated via Supabase CLI. New trigger-only private SECURITY DEFINER function with empty search_path, fully qualified tables and no direct execution for PUBLIC/anon/authenticated/service_role. Definer is necessary because an already-authorized attachment write must atomically invalidate related item revisions even when that writer cannot directly update the items. It accepts no caller-supplied arguments; existing attachment RLS remains unchanged. No existing-row backfill or production DDL.

## Verification

- Nine focused executable action/helper/continuity tests passed, including upload before action (zero writes), after commit/readback (explicit conflict), unchanged-source success and sanitized notices.
- Isolated network-none PostgreSQL16 fixture passed: source-less item fence, stale save, old Undo, supplier-only no-op, client replacement/deletion, unchanged update no-op, unrelated request protection, unchanged known thickness/qualification and private direct-execution denial.
- Actual two-session upload/edit race passed: upload lock completes, stale edit rejects, quantity remains61 rather than stale99.
- Final webpack build passed153 routes. Changed-file ESLint and standalone TypeScript passed. Diff whitespace check clean. Disposable fixture container stopped/removed after verification; no production data was involved.
- Existing built390/1440 Step1 fixture/flow was verified in coordinated base. This patch changes only the existing conflict panel text, not layout; live authenticated attachment upload has not been performed.

## Integration

No changes to request page, large request actions, quote match helpers or comparison workspace. Maya's original-only follow-up may overlap only nearby ReviewList JSX. Keep both her honest autosave wording and this conflict notice. Root owns exact migration approval, final integration checks, production binding and serialized release. No push, deployment, external message or production mutation occurred here.

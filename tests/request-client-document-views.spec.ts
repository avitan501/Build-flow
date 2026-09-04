import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("client document views are version-scoped, token-scoped, and staff-readable only", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260904190858_track_client_document_views.sql"), "utf8")
  expect(migration).toContain("unique (client_document_id, document_version)")
  expect(migration).toContain("document.public_token = p_public_token")
  expect(migration).toContain("document.version = p_document_version")
  expect(migration).toContain("document.document_type in ('estimate', 'invoice')")
  expect(migration).toContain("enable row level security")
  expect(migration).toContain("revoke all on table public.request_client_document_views from public, anon, authenticated")
  expect(migration).toContain("grant select on table public.request_client_document_views to authenticated")
  expect(migration).toContain("private.has_staff_capability('customers')")
  expect(migration).toContain("grant execute on function public.record_request_client_document_view(uuid, integer, uuid)")
})

test("manager previews and authenticated staff do not count as client opens", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260904190858_track_client_document_views.sql"), "utf8")
  const managerPage = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(migration).toContain("p_manager_preview_token = selected_document.manager_preview_token")
  expect(migration).toContain("(select auth.uid()) is not null")
  expect(migration).toContain("private.is_admin()")
  expect(managerPage).toContain("?preview=${saved.managerPreviewToken}")
  expect(migration).toContain("new.manager_preview_token := old.manager_preview_token")
})

test("a visible hydrated client page records opens while deduplicating rapid remounts", async () => {
  const page = await readFile(path.join(root, "app/client-document/[token]/page.tsx"), "utf8")
  const tracker = await readFile(path.join(root, "app/client-document/[token]/client-document-view-tracker.tsx"), "utf8")
  const action = await readFile(path.join(root, "app/client-document/[token]/view-actions.ts"), "utf8")
  expect(page).toContain("<ClientDocumentViewTracker")
  expect(page).toContain('row.document_type !== "receipt"')
  expect(tracker).toContain('document.visibilityState !== "visible"')
  expect(tracker).toContain("window.sessionStorage.getItem(storageKey)")
  expect(tracker).toContain("Date.now() - recentlyRecordedAt < 10_000")
  expect(tracker).toContain("window.setTimeout(recordVisibleView, 1200)")
  expect(action).toContain('rpc("record_request_client_document_view"')
})

test("manager shows the current version open status in New York time", async () => {
  const requestPage = await readFile(path.join(root, "app/owner/materials/requests/[requestId]/page.tsx"), "utf8")
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(requestPage).toContain('from("request_client_document_views")')
  expect(requestPage).toContain("`${entry.id}:${entry.version}`")
  expect(panel).toContain('"Not opened"')
  expect(panel).toContain('`Opened · ${new Date(saved.lastOpenedAt).toLocaleString("en-US"')
  expect(panel).toContain('timeZone: "America/New_York"')
  expect(panel).toContain('second: "2-digit"')
  expect(panel).toContain('timeZoneName: "short"')
})

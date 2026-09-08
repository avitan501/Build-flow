import { readFile } from "node:fs/promises"
import path from "node:path"
import { expect, test } from "@playwright/test"

const root = process.cwd()
const source = (file: string) => readFile(path.join(root, file), "utf8")

test.describe("request attachment source separation", () => {
  test("stores a constrained source and permits scoped staff corrections", async () => {
    const migration = await source("supabase/migrations/20260908190448_classify_request_attachment_source.sql")
    expect(migration).toContain("source_party text not null default 'client'")
    expect(migration).toContain("source_party in ('client', 'supplier', 'internal')")
    expect(migration).toContain("quote_request_attachments_customer_staff_update")
    expect(migration).toContain("request.id = quote_request_attachments.request_id")
  })

  test("keeps client and supplier files in their correct workflow steps", async () => {
    const page = await source("app/owner/materials/requests/[requestId]/page.tsx")
    const worktable = await source("components/buildflow/request-material-worktable.tsx")
    const management = await source("components/buildflow/request-management-panel.tsx")
    expect(page).toContain('file.source_party !== "supplier"')
    expect(page).toContain('file.source_party === "supplier"')
    expect(page).toContain("supplierRequestFiles={supplierRequestFiles.map")
    expect(worktable).toContain("Client request files")
    expect(worktable).toContain('currentSource="client"')
    expect(management).toContain("Supplier files")
    expect(management).toContain('currentSource="supplier"')
  })

  test("uses a compact, explicitly client-scoped upload control", async () => {
    const uploader = await source("components/buildflow/request-attachment-uploader.tsx")
    expect(uploader).toContain('compact ? "Add client file" : "Add documents or photos"')
    expect(uploader).toContain('compact ? "min-h-8 px-2 text-[10px]"')
    expect(uploader).toContain('aria-label="Add client files to request"')
  })

  test("never sends supplier files to the client-list AI or client estimate", async () => {
    const organizer = await source("supabase/functions/client-material-list-ai/index.ts")
    const actions = await source("app/owner/materials/requests/actions.ts")
    const comparison = await source("app/admin/quote-comparison/[comparisonId]/page.tsx")
    expect(organizer).toContain('.neq("source_party", "supplier")')
    expect(actions).toContain('.eq("source_party", "client").in("id", attachmentIds)')
    expect(comparison).toContain('.eq("source_party", "client")')
  })

  test("audits every manual source correction and rolls it back when history fails", async () => {
    const actions = await source("app/owner/materials/requests/actions.ts")
    expect(actions).toContain("classifyRequestAttachmentSourceAction")
    expect(actions).toContain('manager_action: "request_attachment_source"')
    expect(actions).toContain('event_type: "note_added"')
    expect(actions).toContain("previous_source_party: attachment.source_party")
    expect(actions).toContain('update({ source_party: attachment.source_party })')
  })
})

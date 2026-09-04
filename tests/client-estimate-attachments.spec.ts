import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("estimate composer supports direct multi-file upload and edit preload", async () => {
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(panel).toContain('type="file" multiple')
  expect(panel).toContain('accept="image/jpeg,image/png,image/webp,.pdf,.docx,.xlsx"')
  expect(panel).toContain("setDocumentAttachments(saved?.documentData.attachments || [])")
  expect(panel).toContain("addRequestAttachmentsAction({ requestId, attachments: uploads, organize: false })")
  expect(panel).toContain("attachmentIds: documentAttachments.map((entry) => entry.id)")
  expect(panel).toContain("up to 10 files · 25 MB total")
})

test("server resolves selected attachment ids under the exact request and builds the snapshot", async () => {
  const actions = await readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8")
  expect(actions).toContain('.from("quote_request_attachments").select("id,file_name,file_type,file_size").eq("request_id", request.id).in("id", attachmentIds)')
  expect(actions).toContain("data.length !== attachmentIds.length")
  expect(actions).toContain("documentAttachments.reduce((sum, attachment) => sum + attachment.fileSize, 0) > 25 * 1024 * 1024")
  expect(actions).toContain("attachments: documentAttachments")
  expect(actions).toContain("attachmentIds?: string[]")
  expect(actions).not.toContain("documentAttachments: input")
})

test("public attachment download is selected-version and request scoped", async () => {
  const route = await readFile(path.join(root, "app/client-document/[token]/attachments/[attachmentId]/route.ts"), "utf8")
  expect(route).toContain("row.version !== expectedVersion")
  expect(route).toContain('.eq("id", attachmentId).eq("request_id", row.request_id)')
  expect(route).toContain("document?.attachments?.find")
  expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"')
  expect(route).toContain('"X-Content-Type-Options": "nosniff"')
  expect(route).toContain("attachment.file_name !== selected.fileName")
  expect(route).toContain("attachment.file_size !== selected.fileSize")
})

test("live estimate and PDF expose the selected attachment bundle", async () => {
  const page = await readFile(path.join(root, "app/client-document/[token]/page.tsx"), "utf8")
  const pdf = await readFile(path.join(root, "lib/request-client-quote-pdf.ts"), "utf8")
  expect(page).toContain("Attached photos &amp; documents")
  expect(page).toContain("?v=${row.version}")
  expect(page).toContain("sm:grid-cols-2")
  expect(pdf).toContain("ATTACHMENTS INCLUDED WITH THIS DOCUMENT")
  expect(pdf).toContain("Open the live client link to view or download these files.")
})

test("request file validation supports only the documented safe bundle types", async () => {
  const upload = await readFile(path.join(root, "lib/request-attachment-upload.ts"), "utf8")
  expect(upload).toContain('docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"')
  expect(upload).toContain('xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"')
  expect(upload).not.toContain('mp4:')
  expect(upload).not.toContain('application/zip')
})

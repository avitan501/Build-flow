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
  const edge = await readFile(path.join(root, "supabase/functions/client-document-attachment/index.ts"), "utf8")
  expect(route).toContain('endpoint.searchParams.set("version", String(expectedVersion))')
  expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"')
  expect(route).not.toContain("createAdminClient")
  expect(edge).toContain("document?.version === expectedVersion")
  expect(edge).toContain('.eq("id", attachmentId).eq("request_id", document.request_id)')
  expect(edge).toContain("attachmentSnapshots(document.document_data).find")
  expect(edge).toContain("attachment.file_name !== selected.fileName")
  expect(edge).toContain("attachment.file_size !== selected.fileSize")
  expect(edge).toContain('createSignedUrl(attachment.file_path, 90')
  expect(edge).not.toContain(".download(")
})

test("failed browser batches remove already uploaded temporary objects", async () => {
  const panel = await readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8")
  expect(panel).toContain('!registered && uploads.length')
  expect(panel).toContain('storage.from("project-uploads").remove(uploads.map((entry) => entry.storagePath))')
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

test("client document stays readable in narrow message and mobile browsers", async () => {
  const page = await readFile(path.join(root, "app/client-document/[token]/page.tsx"), "utf8")
  expect(page).toContain('className="grid gap-3 md:hidden"')
  expect(page).toContain('className="hidden overflow-hidden rounded-xl border border-slate-200 md:block"')
  expect(page).toContain("break-words text-sm font-bold")
  expect(page).not.toContain('min-w-[38rem]')
  expect(page).not.toContain('overflow-x-auto')
})

test("request file validation supports only the documented safe bundle types", async () => {
  const upload = await readFile(path.join(root, "lib/request-attachment-upload.ts"), "utf8")
  expect(upload).toContain('docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"')
  expect(upload).toContain('xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"')
  expect(upload).not.toContain('mp4:')
  expect(upload).not.toContain('application/zip')
})

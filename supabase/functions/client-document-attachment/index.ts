import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "jsr:@supabase/supabase-js@2"

type DocumentRow = { request_id: string; document_data: unknown; version: number }
type AttachmentRow = { id: string; file_name: string; file_path: string; file_type: string | null; file_size: number | null }
type AttachmentSnapshot = { id: string; fileName: string; fileType: string; fileSize: number }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeDownloadName(value: string) {
  const clean = value.normalize("NFKD").replace(/[^A-Za-z0-9._ -]/g, "-").replace(/\s+/g, " ").trim().slice(0, 160)
  return clean || "Avantia-Build-attachment"
}

function attachmentSnapshots(value: unknown): AttachmentSnapshot[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const rows = (value as { attachments?: unknown }).attachments
  if (!Array.isArray(rows)) return []
  return rows.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
    const row = raw as Record<string, unknown>
    const snapshot = { id: String(row.id || ""), fileName: String(row.fileName || ""), fileType: String(row.fileType || ""), fileSize: Number(row.fileSize) }
    return uuidPattern.test(snapshot.id) && snapshot.fileName && snapshot.fileType && Number.isSafeInteger(snapshot.fileSize) && snapshot.fileSize > 0 ? [snapshot] : []
  }).slice(0, 10)
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } })
  const url = new URL(request.url)
  const token = url.searchParams.get("token") || ""
  const attachmentId = url.searchParams.get("attachmentId") || ""
  const expectedVersion = Number(url.searchParams.get("version"))
  if (!uuidPattern.test(token) || !uuidPattern.test(attachmentId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return new Response("Not found", { status: 404 })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>
  const serviceKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: document } = await admin.from("request_client_documents").select("request_id,document_data,version").eq("public_token", token).maybeSingle<DocumentRow>()
  const selected = document?.version === expectedVersion ? attachmentSnapshots(document.document_data).find((entry) => entry.id === attachmentId) : undefined
  if (!document || !selected) return new Response("Not found", { status: 404 })

  const { data: attachment } = await admin.from("quote_request_attachments").select("id,file_name,file_path,file_type,file_size").eq("id", attachmentId).eq("request_id", document.request_id).maybeSingle<AttachmentRow>()
  if (!attachment
    || attachment.file_name !== selected.fileName
    || attachment.file_type !== selected.fileType
    || attachment.file_size !== selected.fileSize) return new Response("Not found", { status: 404 })

  const { data: signed, error } = await admin.storage.from("project-uploads").createSignedUrl(attachment.file_path, 90, { download: safeDownloadName(selected.fileName) })
  if (error || !signed?.signedUrl) return new Response("Attachment unavailable", { status: 503 })
  return Response.redirect(signed.signedUrl, 302)
})

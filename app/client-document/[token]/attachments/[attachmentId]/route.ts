import { NextResponse } from "next/server"

import { parseRequestClientDocument, type StoredRequestClientDocument } from "@/lib/request-client-document-data"
import { validateRequestAttachmentFile } from "@/lib/request-attachment-upload"
import { createAdminClient } from "@/lib/supabase/admin"

function safeDownloadName(value: string) {
  const clean = value.normalize("NFKD").replace(/[^A-Za-z0-9._ -]/g, "-").replace(/\s+/g, " ").trim().slice(0, 160)
  return clean || "Avantia-Build-attachment"
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string; attachmentId: string }> }) {
  const { token, attachmentId } = await params
  const expectedVersion = Number(new URL(request.url).searchParams.get("v"))
  if (!/^[0-9a-f-]{36}$/i.test(token) || !/^[0-9a-f-]{36}$/i.test(attachmentId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return new NextResponse("Not found", { status: 404 })
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return new NextResponse("Attachment unavailable", { status: 503 })
  }
  const { data: row } = await admin.from("request_client_documents").select("request_id,document_type,document_number,document_data,version,updated_at").eq("public_token", token).maybeSingle<StoredRequestClientDocument & { request_id: string }>()
  if (!row || row.version !== expectedVersion) return new NextResponse("Not found", { status: 404 })
  const document = parseRequestClientDocument(row)
  const selected = document?.attachments?.find((entry) => entry.id === attachmentId)
  if (!selected || validateRequestAttachmentFile({ filename: selected.fileName, type: selected.fileType, size: selected.fileSize })) return new NextResponse("Not found", { status: 404 })
  const { data: attachment } = await admin.from("quote_request_attachments").select("id,file_name,file_path,file_type,file_size").eq("id", attachmentId).eq("request_id", row.request_id).maybeSingle<{ id: string; file_name: string; file_path: string; file_type: string | null; file_size: number | null }>()
  if (!attachment || attachment.file_name !== selected.fileName || attachment.file_type !== selected.fileType || attachment.file_size !== selected.fileSize) return new NextResponse("Not found", { status: 404 })
  const { data, error } = await admin.storage.from("project-uploads").download(attachment.file_path)
  if (error || !data || data.size !== selected.fileSize) return new NextResponse("Attachment unavailable", { status: 503 })
  return new NextResponse(data, { headers: {
    "Content-Type": selected.fileType,
    "Content-Length": String(selected.fileSize),
    "Content-Disposition": `attachment; filename="${safeDownloadName(selected.fileName)}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  } })
}

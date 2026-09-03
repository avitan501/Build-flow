import { NextResponse } from "next/server"

import { parseRequestClientDocument, type StoredRequestClientDocument } from "@/lib/request-client-document-data"
import { generateRequestClientQuotePdf } from "@/lib/request-client-quote-pdf"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse("Not found", { status: 404 })
  const { data: row } = await createAdminClient().from("request_client_documents").select("document_type,document_number,document_data,version,updated_at").eq("public_token", token).maybeSingle<StoredRequestClientDocument>()
  if (!row) return new NextResponse("Not found", { status: 404 })
  const document = parseRequestClientDocument(row)
  if (!document) return new NextResponse("Not found", { status: 404 })
  const pdf = await generateRequestClientQuotePdf(document)
  const label = row.document_type === "invoice" ? "Invoice" : row.document_type === "receipt" ? "Receipt" : "Estimate"
  const fileName = `Avantia-Build-${label}-${row.document_number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf`
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store, max-age=0" } })
}

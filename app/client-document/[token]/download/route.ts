import { NextResponse } from "next/server"

import { parseRequestClientDocument, type StoredRequestClientDocument } from "@/lib/request-client-document-data"
import { generateRequestClientQuotePdf } from "@/lib/request-client-quote-pdf"
import { createClient } from "@/lib/supabase/server"

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse("Not found", { status: 404 })
  const supabase = await createClient()
  const { data: row } = await supabase.rpc("get_request_client_document", { p_public_token: token }).maybeSingle<StoredRequestClientDocument>()
  if (!row) return new NextResponse("Not found", { status: 404 })
  const document = parseRequestClientDocument(row)
  if (!document) return new NextResponse("Not found", { status: 404 })
  const pdf = await generateRequestClientQuotePdf(document)
  const label = row.document_type === "invoice" ? "Invoice" : row.document_type === "receipt" ? "Receipt" : "Estimate"
  const fileName = `Avantia-Build-${label}-${row.document_number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf`
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store, max-age=0" } })
}

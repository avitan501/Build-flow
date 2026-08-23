import { requireStaffProfile } from "@/lib/auth"
import { requestMaterialChartCsv, toRequestMaterialChartRow, type RequestMaterialChartSource } from "@/lib/request-material-chart"

function filePart(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "client-request"
}

export async function GET(_request: Request, context: RouteContext<"/admin/supplier-quotes/requests/[requestId]/chart">) {
  const { requestId } = await context.params
  const { supabase } = await requireStaffProfile("suppliers")
  const [{ data: request }, { data: items, error }] = await Promise.all([
    supabase.from("quote_requests").select("id,title").eq("id", requestId).maybeSingle<{ id: string; title: string }>(),
    supabase.from("quote_request_items").select("request_id,name,department,item_type,quantity,unit,answers,metadata").eq("request_id", requestId).order("created_at").returns<RequestMaterialChartSource[]>(),
  ])

  if (!request) return new Response("Request not found.", { status: 404 })
  if (error) return new Response("The request chart could not be prepared.", { status: 500 })

  const csv = requestMaterialChartCsv((items ?? []).map(toRequestMaterialChartRow))
  const caseNumber = request.id.replaceAll("-", "").slice(0, 8).toUpperCase()
  const fileName = `${filePart(request.title)}-${caseNumber}.csv`
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

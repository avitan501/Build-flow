import { requireManagerPortalProfile } from "@/lib/auth"
import { normalizeManagerSearchQuery, safeManagerDatabaseSearchTerm, type ManagerSearchResult } from "@/lib/manager-global-search"

function resultUrl(path: string, query: string) {
  return `${path}${path.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`
}

export async function GET(request: Request) {
  const { supabase, access } = await requireManagerPortalProfile()
  const query = normalizeManagerSearchQuery(new URL(request.url).searchParams.get("q") ?? "")
  const term = safeManagerDatabaseSearchTerm(query)
  if (term.length < 2) return Response.json({ results: [] satisfies ManagerSearchResult[] })

  const pattern = `%${term}%`
  const [clients, leads, requests, numericRequest, supplierQuotes] = await Promise.all([
    access.customers
      ? supabase.from("profiles").select("id,full_name,email,phone,company_name").eq("role", "client").eq("is_active", true).or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},company_name.ilike.${pattern}`).limit(8)
      : Promise.resolve({ data: [], error: null }),
    access.customers
      ? supabase.from("manager_outreach_leads").select("id,full_name,email,phone,company_name,status").or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},company_name.ilike.${pattern}`).limit(6)
      : Promise.resolve({ data: [], error: null }),
    access.customers
      ? supabase.from("quote_requests").select("id,public_number,title,status").ilike("title", pattern).order("updated_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [], error: null }),
    access.customers && /^\d{1,12}$/.test(term)
      ? supabase.from("quote_requests").select("id,public_number,title,status").eq("public_number", Number(term)).limit(1)
      : Promise.resolve({ data: [], error: null }),
    access.suppliers
      ? supabase.from("supplier_quotes").select("id,supplier_name,client_name_snapshot,quote_number,status").or(`supplier_name.ilike.${pattern},client_name_snapshot.ilike.${pattern},quote_number.ilike.${pattern}`).neq("status", "archived").order("updated_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [], error: null }),
  ])

  const results: ManagerSearchResult[] = []
  for (const client of clients.data ?? []) {
    const title = client.full_name?.trim() || client.company_name?.trim() || client.email || "Client"
    results.push({ id: `client-${client.id}`, title, description: [client.company_name, client.phone, client.email].filter(Boolean).join(" · "), href: `${resultUrl("/admin/users?view=customers", title)}#client-${client.id}`, category: "Client" })
  }
  for (const lead of leads.data ?? []) {
    const title = lead.full_name?.trim() || lead.company_name?.trim() || lead.phone || "Lead"
    results.push({ id: `lead-${lead.id}`, title, description: [lead.company_name, lead.phone, lead.status].filter(Boolean).join(" · "), href: resultUrl("/admin/users?view=leads", title), category: "Lead" })
  }
  const requestRows = [...(numericRequest.data ?? []), ...(requests.data ?? [])]
  const seenRequests = new Set<string>()
  for (const item of requestRows) {
    if (seenRequests.has(item.id)) continue
    seenRequests.add(item.id)
    results.push({ id: `request-${item.id}`, title: item.title, description: `Request #${item.public_number} · ${String(item.status).replaceAll("_", " ")}`, href: `/owner/materials/requests/${item.id}`, category: "Request" })
  }
  for (const quote of supplierQuotes.data ?? []) {
    results.push({ id: `supplier-quote-${quote.id}`, title: quote.supplier_name, description: [quote.quote_number ? `Quote ${quote.quote_number}` : "Supplier quote", quote.client_name_snapshot, String(quote.status).replaceAll("_", " ")].filter(Boolean).join(" · "), href: `/admin/supplier-quotes/${quote.id}`, category: "Supplier quote" })
  }

  return Response.json({ results: results.slice(0, 20) }, { headers: { "Cache-Control": "private, no-store" } })
}

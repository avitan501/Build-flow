import { NextResponse } from "next/server"

import { catalogMatchScore } from "@/lib/catalog-match-score"
import { searchCatalogWithExa } from "@/lib/exa-catalog-search"
import { requireStaffProfile } from "@/lib/auth"

function scoredResults(results: Array<Record<string, unknown>>, query: string) {
  return results.map((result) => {
    const score = catalogMatchScore(query, String(result.title ?? ""), String(result.snippet ?? ""))
    return { ...result, matchScore: score, matchConfidence: score >= 85 ? "exact" : "likely" }
  })
}

function mergeByUrl(...groups: Array<Array<Record<string, unknown>>>) {
  const merged = new Map<string, Record<string, unknown>>()
  for (const result of groups.flat()) {
    const url = String(result.url ?? "").trim()
    if (url && !merged.has(url)) merged.set(url, result)
  }
  return [...merged.values()]
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaffProfile("quotes")
    const body = await request.json() as { query?: unknown; department?: unknown; zipCode?: unknown; domains?: unknown; excludeDomains?: unknown }
    const query = String(body.query ?? "")
    const result = await searchCatalogWithExa({
      query,
      department: String(body.department ?? ""),
      zipCode: String(body.zipCode ?? ""),
      domains: Array.isArray(body.domains) ? body.domains.filter((value): value is string => typeof value === "string") : undefined,
      excludeDomains: Array.isArray(body.excludeDomains) ? body.excludeDomains.filter((value): value is string => typeof value === "string") : undefined,
    })
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean
      results?: Array<Record<string, unknown>>
      buyNow?: Array<Record<string, unknown>>
      callForPrice?: Array<Record<string, unknown>>
      salesContacts?: Array<Record<string, unknown>>
      checkedAt?: string
      error?: string
    }>("aura-messaging-broker", {
      body: {
        action: "price_research",
        query,
        department: String(body.department ?? ""),
        zipCode: String(body.zipCode ?? "11516"),
        excludeDomains: Array.isArray(body.excludeDomains) ? body.excludeDomains.filter((value): value is string => typeof value === "string") : [],
      },
    })
    const exaResults = result.ok ? result.results as unknown as Array<Record<string, unknown>> : []
    const brokerResults = data?.buyNow ?? data?.results ?? []
    const buyNow = scoredResults(mergeByUrl(brokerResults, exaResults), query)
    if ((!error && data?.ok) || (result.ok && result.results.length)) return NextResponse.json({
      ok: true,
      results: buyNow,
      buyNow,
      callForPrice: scoredResults(data?.callForPrice ?? [], query),
      salesContacts: data?.salesContacts ?? [],
      checkedAt: data?.checkedAt ?? (result.ok ? result.checkedAt : new Date().toISOString()),
      fallbackLinks: result.fallbackLinks,
    })
    return NextResponse.json({ ...result, error: data?.error || result.error, fallbackLinks: result.fallbackLinks }, { status: result.code === "invalid" ? 400 : 503 })
  } catch (error) {
    console.error("Manager Exa catalog search unauthorized or failed", error)
    return NextResponse.json({ ok: false, code: "unauthorized", error: "Manager sign-in is required." }, { status: 401 })
  }
}

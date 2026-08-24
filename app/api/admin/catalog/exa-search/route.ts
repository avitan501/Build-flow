import { NextResponse } from "next/server"

import { searchCatalogWithExa } from "@/lib/exa-catalog-search"
import { requireStaffProfile } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaffProfile("quotes")
    const body = await request.json() as { query?: unknown; department?: unknown; zipCode?: unknown; domains?: unknown; excludeDomains?: unknown }
    const fallbackLinks = (await searchCatalogWithExa({ query: String(body.query ?? "") })).fallbackLinks
    const result = await searchCatalogWithExa({
      query: String(body.query ?? ""),
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
        query: String(body.query ?? ""),
        department: String(body.department ?? ""),
        zipCode: String(body.zipCode ?? "11516"),
        excludeDomains: Array.isArray(body.excludeDomains) ? body.excludeDomains.filter((value): value is string => typeof value === "string") : [],
      },
    })
    if (!error && data?.ok) return NextResponse.json({
      ok: true,
      results: data.buyNow ?? data.results ?? [],
      buyNow: data.buyNow ?? data.results ?? [],
      callForPrice: data.callForPrice ?? [],
      salesContacts: data.salesContacts ?? [],
      checkedAt: data.checkedAt ?? new Date().toISOString(),
      fallbackLinks,
    })
    if (result.ok && result.results.length) return NextResponse.json({ ...result, buyNow: result.results, callForPrice: [], salesContacts: [] })
    return NextResponse.json({ ...result, error: data?.error || result.error, fallbackLinks }, { status: result.code === "invalid" ? 400 : 503 })
  } catch (error) {
    console.error("Manager Exa catalog search unauthorized or failed", error)
    return NextResponse.json({ ok: false, code: "unauthorized", error: "Manager sign-in is required." }, { status: 401 })
  }
}

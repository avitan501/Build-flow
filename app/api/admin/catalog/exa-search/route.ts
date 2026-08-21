import { NextResponse } from "next/server"

import { searchCatalogWithExa } from "@/lib/exa-catalog-search"
import { requireManagerPortalProfile } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    await requireManagerPortalProfile()
    const body = await request.json() as { query?: unknown; department?: unknown; zipCode?: unknown; domains?: unknown }
    const result = await searchCatalogWithExa({
      query: String(body.query ?? ""),
      department: String(body.department ?? ""),
      zipCode: String(body.zipCode ?? ""),
      domains: Array.isArray(body.domains) ? body.domains.filter((value): value is string => typeof value === "string") : undefined,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : result.code === "not_configured" ? 503 : 400 })
  } catch (error) {
    console.error("Manager Exa catalog search unauthorized or failed", error)
    return NextResponse.json({ ok: false, code: "unauthorized", error: "Manager sign-in is required." }, { status: 401 })
  }
}

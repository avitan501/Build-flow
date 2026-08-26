import { NextResponse } from "next/server"

import { getSessionWithProfile } from "@/lib/auth"
import { searchLocations } from "@/lib/location-search"
import { managerCapabilities } from "@/lib/owner-identity"

export const runtime = "nodejs"
export const preferredRegion = "iad1"

export async function GET(request: Request) {
  const { user, profile } = await getSessionWithProfile()
  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 })
  const access = managerCapabilities({
    email: user.email || profile?.email || null,
    role: profile?.role,
    approvalStatus: profile?.approval_status,
    isActive: profile?.is_active,
  })
  if (!access.aiTools) return NextResponse.json({ ok: false, error: "Manager access required." }, { status: 403 })

  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim() || ""
  const mode = url.searchParams.get("mode") === "store" ? "store" : "address"
  if (query.length < 3 || query.length > 160) return NextResponse.json({ ok: true, suggestions: [] })
  const suggestions = await searchLocations(query, mode)
  return NextResponse.json({ ok: true, suggestions }, { headers: { "Cache-Control": "private, max-age=60" } })
}

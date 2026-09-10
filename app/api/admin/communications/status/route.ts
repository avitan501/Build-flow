import { NextResponse } from "next/server"

import { getSessionWithProfile } from "@/lib/auth"
import { loadAuraConnectionStatus } from "@/lib/aura/dashboard"
import { managerCapabilities } from "@/lib/owner-identity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getSessionWithProfile()
  if (!session.user || !session.supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  })
  if (!access.communications) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const connections = await loadAuraConnectionStatus(session.supabase)
  return NextResponse.json({ connections }, { headers: { "Cache-Control": "private, no-store" } })
}

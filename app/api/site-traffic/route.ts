import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { getSupabasePublicEnv, hasSupabaseBuildEnv } from "@/lib/supabase/env"

function safeReferrerHost(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    return new URL(value).hostname.slice(0, 255) || null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 4096) return new NextResponse(null, { status: 413 })
  const origin = request.headers.get("origin")
  if (origin) {
    try {
      const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host
      if (new URL(origin).host !== requestHost) return new NextResponse(null, { status: 403 })
    } catch {
      return new NextResponse(null, { status: 403 })
    }
  }
  if (/bot|crawler|spider|preview|playwright|headless|codex/i.test(request.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 })
  if (!hasSupabaseBuildEnv()) return new NextResponse(null, { status: 204 })

  try {
    const payload = await request.json() as { path?: unknown; sessionId?: unknown; referrer?: unknown }
    const path = typeof payload.path === "string" ? payload.path.trim().split("?")[0].slice(0, 300) : ""
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim().slice(0, 100) : ""
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api") || sessionId.length < 12) return new NextResponse(null, { status: 204 })
    const userAgent = request.headers.get("user-agent") || ""
    const sessionHash = createHash("sha256").update(sessionId).digest("hex").slice(0, 32)
    const { url, anonKey } = getSupabasePublicEnv()
    const { error } = await createClient(url, anonKey).rpc("record_site_page_view", {
      p_path: path,
      p_referrer_host: safeReferrerHost(payload.referrer),
      p_session_hash: sessionHash,
      p_device_class: /android|iphone|ipad|mobile/i.test(userAgent) ? "mobile" : "desktop",
    })
    if (error) console.error("Site traffic recording failed.", { code: error.code })
  } catch (error) {
    console.error("Site traffic recording failed.", error instanceof Error ? error.message : "Unknown error")
  }
  return new NextResponse(null, { status: 204 })
}

import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { hasSupabasePublicEnv } from "@/lib/supabase/env"

const PRODUCTION_HOSTS = new Set(["build.avantiap.com", "www.build.avantiap.com"])

function safeReferrerHost(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    return new URL(value).hostname.slice(0, 255) || null
  } catch {
    return null
  }
}

function safeHeader(value: string | null, maxLength: number) {
  if (!value?.trim()) return null
  return value.trim().slice(0, maxLength)
}

function safeCity(value: string | null) {
  if (!value?.trim()) return null
  try {
    return decodeURIComponent(value).trim().slice(0, 120) || null
  } catch {
    return value.trim().slice(0, 120) || null
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 4096) return new NextResponse(null, { status: 413 })
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase()
  const requestHost = (forwardedHost || request.headers.get("host") || new URL(request.url).host).split(":")[0]
  const origin = request.headers.get("origin")
  if (origin) {
    try {
      if (new URL(origin).host.split(":")[0].toLowerCase() !== requestHost) return new NextResponse(null, { status: 403 })
    } catch {
      return new NextResponse(null, { status: 403 })
    }
  }
  if (!PRODUCTION_HOSTS.has(requestHost)) return new NextResponse(null, { status: 204 })
  if (/bot|crawler|spider|preview|playwright|headless|codex/i.test(request.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 })
  if (!hasSupabasePublicEnv()) return new NextResponse(null, { status: 204 })

  try {
    const payload = await request.json() as { path?: unknown; sessionId?: unknown; referrer?: unknown }
    const path = typeof payload.path === "string" ? payload.path.trim().split("?")[0].slice(0, 300) : ""
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim().slice(0, 100) : ""
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api") || sessionId.length < 12) return new NextResponse(null, { status: 204 })
    const userAgent = request.headers.get("user-agent") || ""
    const sessionHash = createHash("sha256").update(sessionId).digest("hex").slice(0, 32)
    const serverClient = await createServerClient()
    const { error } = await serverClient.rpc("record_site_page_view", {
      p_path: path,
      p_referrer_host: safeReferrerHost(payload.referrer),
      p_session_hash: sessionHash,
      p_device_class: /android|iphone|ipad|mobile/i.test(userAgent) ? "mobile" : "desktop",
      p_city: safeCity(request.headers.get("x-vercel-ip-city")),
      p_region: safeHeader(request.headers.get("x-vercel-ip-country-region"), 120),
      p_country: safeHeader(request.headers.get("x-vercel-ip-country"), 2)?.toUpperCase() ?? null,
    })
    if (error) console.error("Site traffic recording failed.", { code: error.code })
  } catch (error) {
    console.error("Site traffic recording failed.", error instanceof Error ? error.message : "Unknown error")
  }
  return new NextResponse(null, { status: 204 })
}

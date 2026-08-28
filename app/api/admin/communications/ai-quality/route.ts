import { requireManagerPortalProfile } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.owner) return Response.json({ error: "Owner access is required." }, { status: 403 })
  let body: { cases?: Array<{ id?: string; message?: string }> }
  try {
    body = await request.json() as { cases?: Array<{ id?: string; message?: string }> }
  } catch {
    return Response.json({ error: "Invalid quality-check request." }, { status: 400 })
  }
  const cases = Array.isArray(body.cases) ? body.cases.slice(0, 20).flatMap((entry, index) => {
    const message = typeof entry?.message === "string" ? entry.message.trim().slice(0, 1600) : ""
    if (!message) return []
    return [{ id: typeof entry.id === "string" ? entry.id.slice(0, 40) : `case-${index + 1}`, message }]
  }) : []
  if (!cases.length) return Response.json({ error: "Add at least one test message." }, { status: 400 })
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; results?: unknown[]; error?: string }>("aura-messaging-broker", { body: { action: "quality_check_sms_ai", cases } })
  if (error || !data?.ok) return Response.json({ error: data?.error || "AI quality check failed." }, { status: 502 })
  return Response.json({ ok: true, results: data.results || [] }, { headers: { "Cache-Control": "no-store" } })
}

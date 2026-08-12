import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const companyEmail = "office@build.avantiap.com"
const ownerEmail = "avitanneto@gmail.com"
const corsHeaders = {
  "access-control-allow-origin": "https://build.avantiap.com",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json" } })
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  const resendKey = Deno.env.get("RESEND_API_KEY") || ""
  if (!token || !supabaseUrl || !serviceRoleKey) return json({ error: "unauthorized" }, 401)
  if (!resendKey) return json({ error: "email_not_configured" }, 503)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: authenticated, error: authenticationError } = await admin.auth.getUser(token)
  if (authenticationError || !authenticated.user) return json({ error: "unauthorized" }, 401)

  const email = authenticated.user.email?.trim().toLowerCase() || ""
  const [{ data: profile }, { data: grant }] = await Promise.all([
    admin.from("profiles").select("role,approval_status,is_active").eq("id", authenticated.user.id).maybeSingle<{ role: string; approval_status: string; is_active: boolean }>(),
    admin.from("staff_access_grants").select("can_manage_suppliers,active").ilike("email", email).maybeSingle<{ can_manage_suppliers: boolean; active: boolean }>(),
  ])
  const isOwner = email === ownerEmail && profile?.role === "admin" && profile.approval_status === "approved" && profile.is_active
  const isSupplierStaff = profile?.role === "staff" && profile.approval_status === "approved" && profile.is_active && grant?.active && grant.can_manage_suppliers
  if (!isOwner && !isSupplierStaff) return json({ error: "forbidden" }, 403)

  let requestId = ""
  try {
    requestId = String((await request.json())?.requestId || "")
  } catch {
    return json({ error: "invalid_json" }, 400)
  }
  if (!requestId) return json({ error: "invalid_request" }, 400)

  const { data: quoteRequest } = await admin
    .from("supplier_quote_requests")
    .select("id,supplier_name,supplier_email,job_address,subject,material_list,sent_by")
    .eq("id", requestId)
    .eq("sent_by", authenticated.user.id)
    .maybeSingle<{ id: string; supplier_name: string; supplier_email: string; job_address: string; subject: string; material_list: string; sent_by: string }>()
  if (!quoteRequest) return json({ error: "request_not_found" }, 404)

  const text = [
    `Hello ${quoteRequest.supplier_name},`,
    "",
    `Please provide pricing and availability for the following materials for our project at ${quoteRequest.job_address}:`,
    "",
    quoteRequest.material_list,
    "",
    "Please include lead times, delivery availability, and any delivery charges.",
    "Reply to this email with your quote or any questions.",
    "",
    "Avantia Build",
    companyEmail,
    "https://build.avantiap.com",
  ].join("\n")
  const html = `<div style="margin:0;background:#f3f6f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><div style="max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:16px;background:#fff"><div style="padding:20px 22px;border-bottom:1px solid #e5eaf1"><strong style="font-size:19px;color:#071126">Avantia Build</strong><br><span style="font-size:13px;color:#64748b">Material sourcing desk</span></div><div style="padding:24px 22px"><p>Hello ${escapeHtml(quoteRequest.supplier_name)},</p><h1 style="font-size:24px;color:#071126">Material quote request</h1><p>Please provide pricing and availability for the materials below.</p><div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc"><strong>Job location</strong><br>${escapeHtml(quoteRequest.job_address)}</div><h2 style="font-size:16px">Material list</h2><div style="white-space:pre-wrap;border-left:3px solid #0071e3;padding:4px 0 4px 14px">${escapeHtml(quoteRequest.material_list)}</div><p>Please include lead times, delivery availability, and any delivery charges.</p><p>Reply to this email with your quote or any questions.</p><div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5eaf1;color:#64748b;font-size:13px"><strong style="color:#071126">Avantia Build</strong><br><a href="mailto:${companyEmail}" style="color:#06c">${companyEmail}</a> · <a href="https://build.avantiap.com" style="color:#06c">build.avantiap.com</a></div></div></div></div>`

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
        "idempotency-key": `avantia-supplier-quote-${quoteRequest.id}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("QUOTE_SUBMISSION_FROM") || `Avantia Build <${companyEmail}>`,
        to: [quoteRequest.supplier_email],
        subject: quoteRequest.subject,
        html,
        text,
        reply_to: companyEmail,
      }),
    })
    const payload = await response.json().catch(() => null) as { id?: string; message?: string; error?: string } | null
    if (!response.ok) {
      const error = payload?.message || payload?.error || `Email provider returned ${response.status}`
      await admin.from("supplier_quote_requests").update({ status: "failed", error_message: error }).eq("id", quoteRequest.id)
      return json({ error }, 502)
    }

    await admin.from("supplier_quote_requests").update({ status: "sent", provider_message_id: payload?.id || null, sent_at: new Date().toISOString(), error_message: null }).eq("id", quoteRequest.id)
    console.log("supplier_quote_email", { requestId: quoteRequest.id, status: "sent" })
    return json({ ok: true, providerId: payload?.id || null })
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Email provider could not be reached"
    await admin.from("supplier_quote_requests").update({ status: "failed", error_message: error }).eq("id", quoteRequest.id)
    return json({ error }, 502)
  }
})

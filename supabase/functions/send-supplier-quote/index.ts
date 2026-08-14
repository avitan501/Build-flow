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
    admin.from("staff_access_grants").select("can_manage_suppliers,can_manage_customers,active").ilike("email", email).maybeSingle<{ can_manage_suppliers: boolean; can_manage_customers: boolean; active: boolean }>(),
  ])
  const isOwner = email === ownerEmail && profile?.role === "admin" && profile.approval_status === "approved" && profile.is_active
  const isSupplierStaff = profile?.role === "staff" && profile.approval_status === "approved" && profile.is_active && grant?.active && grant.can_manage_suppliers
  const isCustomerStaff = profile?.role === "staff" && profile.approval_status === "approved" && profile.is_active && grant?.active && grant.can_manage_customers

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }
  const action = String(payload.action || "send_supplier_quote")
  const requestId = String(payload.requestId || "")
  if (!requestId) return json({ error: "invalid_request" }, 400)

  if (action === "send_client_reply") {
    if (!isOwner && !isCustomerStaff) return json({ error: "forbidden" }, 403)
    const message = String(payload.message || "").trim()
    const rawItems = Array.isArray(payload.items) ? payload.items : []
    const attachment = payload.attachment && typeof payload.attachment === "object"
      ? payload.attachment as { filename?: unknown; content?: unknown }
      : null
    if (!message || message.length > 10_000) return json({ error: "invalid_message" }, 400)
    if (attachment && (typeof attachment.filename !== "string" || typeof attachment.content !== "string" || attachment.content.length > 14_500_000)) {
      return json({ error: "invalid_attachment" }, 400)
    }

    const { data: clientRequest } = await admin
      .from("quote_requests")
      .select("id,title,owner_id")
      .eq("id", requestId)
      .maybeSingle<{ id: string; title: string; owner_id: string }>()
    if (!clientRequest) return json({ error: "request_not_found" }, 404)
    const { data: client } = await admin
      .from("profiles")
      .select("full_name,email")
      .eq("id", clientRequest.owner_id)
      .maybeSingle<{ full_name: string | null; email: string | null }>()
    const recipientEmail = client?.email?.trim().toLowerCase() || ""
    if (!/^\S+@\S+\.\S+$/.test(recipientEmail)) return json({ error: "client_email_required" }, 400)

    const items = rawItems.slice(0, 100).map((raw) => {
      const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
      return {
        name: String(item.name || "Item").slice(0, 300),
        quantity: String(item.quantity ?? ""),
        unit: String(item.unit || ""),
        details: Array.isArray(item.details) ? item.details.map((detail) => String(detail)).filter(Boolean).slice(0, 30) : [],
      }
    })
    const itemText = items.flatMap((item) => [
      `${item.quantity}${item.unit ? ` ${item.unit}` : ""} - ${item.name}`,
      ...item.details.map((detail) => `  ${detail}`),
    ]).join("\n")
    const escapedMessage = escapeHtml(message).replace(/\n/g, "<br>")
    const escapedItems = escapeHtml(itemText)
    const subject = `Avantia Build update: ${clientRequest.title}`

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("QUOTE_SUBMISSION_FROM") || `Avantia Build <${companyEmail}>`,
          to: [recipientEmail],
          subject,
          html: `<div style="margin:0;background:#f3f6f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><div style="max-width:680px;margin:0 auto;border:1px solid #dbe3ee;border-radius:16px;background:#fff;overflow:hidden"><div style="padding:20px 22px;border-bottom:1px solid #e5eaf1"><strong style="font-size:19px;color:#071126">Avantia Build</strong></div><div style="padding:24px 22px"><p>${escapedMessage}</p>${escapedItems ? `<h2 style="font-size:16px">Request details</h2><div style="white-space:pre-wrap;border-left:3px solid #0071e3;padding-left:14px">${escapedItems}</div>` : ""}<div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5eaf1;color:#64748b;font-size:13px"><strong style="color:#071126">Avantia Build</strong><br><a href="mailto:${companyEmail}" style="color:#06c">${companyEmail}</a> · (516) 908-8319</div></div></div></div>`,
          text: [message, itemText ? `\nRequest details:\n${itemText}` : "", "\nAvantia Build", companyEmail, "(516) 908-8319"].filter(Boolean).join("\n"),
          reply_to: companyEmail,
          attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : undefined,
        }),
      })
      const result = await response.json().catch(() => null) as { id?: string; message?: string; error?: string } | null
      if (!response.ok) return json({ error: result?.message || result?.error || `Email provider returned ${response.status}` }, 502)
      console.log("client_reply_email", { requestId, status: "sent" })
      return json({ ok: true, providerId: result?.id || null })
    } catch (cause) {
      return json({ error: cause instanceof Error ? cause.message : "Email provider could not be reached" }, 502)
    }
  }

  if (action !== "send_supplier_quote") return json({ error: "invalid_action" }, 400)
  if (!isOwner && !isSupplierStaff) return json({ error: "forbidden" }, 403)

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

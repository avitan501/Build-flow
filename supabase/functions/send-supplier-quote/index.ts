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

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function nonNegativeNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 32_768
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
  }
  return btoa(binary)
}

function safeAttachmentName(value: string) {
  return value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180) || "attachment"
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

  if (action === "send_client_quote") {
    if (!isOwner && !isSupplierStaff) return json({ error: "forbidden" }, 403)
    const attachment = payload.attachment && typeof payload.attachment === "object"
      ? payload.attachment as { filename?: unknown; content?: unknown }
      : null
    const deliveryId = String(payload.deliveryId || "")
    if (!attachment || typeof attachment.filename !== "string" || typeof attachment.content !== "string" || attachment.content.length > 14_500_000) {
      return json({ error: "invalid_attachment" }, 400)
    }
    if (!/^[0-9a-f-]{36}$/i.test(deliveryId)) return json({ error: "invalid_delivery_id" }, 400)

    const { data: comparison } = await admin
      .from("quote_comparisons")
      .select("id,quote_number,client_name_snapshot,client_email_snapshot,job_address,client_message,client_delivery_charge,client_tax_percent,awarded_bid_id")
      .eq("id", requestId)
      .maybeSingle<{
        id: string
        quote_number: string
        client_name_snapshot: string
        client_email_snapshot: string
        job_address: string
        client_message: string
        client_delivery_charge: number
        client_tax_percent: number
        awarded_bid_id: string | null
      }>()
    if (!comparison?.awarded_bid_id) return json({ error: "quote_not_ready" }, 400)
    const recipientEmail = comparison.client_email_snapshot.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(recipientEmail)) return json({ error: "client_email_required" }, 400)

    const { data: attachmentRows, error: attachmentRowsError } = await admin
      .from("quote_comparison_client_attachments")
      .select("id,file_name,file_path,file_type,file_size")
      .eq("comparison_id", comparison.id)
      .order("created_at")
    if (attachmentRowsError) return json({ error: "quote_attachments_unavailable" }, 500)
    if ((attachmentRows ?? []).length > 10) return json({ error: "too_many_quote_attachments" }, 400)
    const storedAttachmentBytes = (attachmentRows ?? []).reduce((sum, row) => sum + nonNegativeNumber(row.file_size), 0)
    if (storedAttachmentBytes > 25 * 1024 * 1024) return json({ error: "quote_attachments_too_large" }, 400)
    const emailAttachments = [{ filename: safeAttachmentName(attachment.filename), content: attachment.content }]
    for (const row of attachmentRows ?? []) {
      const { data: file, error: downloadError } = await admin.storage.from("project-uploads").download(String(row.file_path || ""))
      if (downloadError || !file || file.size !== Number(row.file_size)) return json({ error: "quote_attachment_download_failed" }, 500)
      emailAttachments.push({ filename: safeAttachmentName(String(row.file_name || "attachment")), content: bytesToBase64(new Uint8Array(await file.arrayBuffer())) })
    }

    const { data: rows } = await admin
      .from("quote_comparison_items")
      .select("description,specification,quantity,unit,client_unit_price,sort_order")
      .eq("comparison_id", comparison.id)
      .order("sort_order")
    const items = (rows ?? []).map((row) => {
      const quantity = nonNegativeNumber(row.quantity)
      const unitPrice = row.client_unit_price === null ? null : nonNegativeNumber(row.client_unit_price)
      return {
        description: String(row.description || "Material").slice(0, 300),
        specification: String(row.specification || "").slice(0, 1000),
        quantity,
        unit: String(row.unit || "each").slice(0, 40),
        unitPrice,
        lineTotal: quantity * (unitPrice ?? 0),
      }
    })
    if (!items.length || items.some((item) => item.unitPrice === null)) return json({ error: "client_prices_incomplete" }, 400)

    const materials = items.reduce((total, item) => total + item.lineTotal, 0)
    const delivery = nonNegativeNumber(comparison.client_delivery_charge)
    const taxPercent = Math.min(100, nonNegativeNumber(comparison.client_tax_percent ?? 8.875))
    const tax = Math.round((materials + delivery) * taxPercent) / 100
    const total = materials + delivery + tax
    const subject = `Avantia Build material quote ${comparison.quote_number}`
    const itemText = items.map((item) => `${item.quantity} ${item.unit} - ${item.description}${item.specification ? ` (${item.specification})` : ""}: ${money(item.lineTotal)}`)
    const text = [
      `Hi ${comparison.client_name_snapshot || "Client"},`, "",
      `Your Avantia Build material quote ${comparison.quote_number} is ready.`,
      `Job location: ${comparison.job_address || "Not provided"}`, "", "Materials:", ...itemText,
      ...(delivery > 0 ? [`Delivery: ${money(delivery)}`] : []),
      `Sales tax (${taxPercent.toFixed(3)}%): ${money(tax)}`,
      `Total: ${money(total)}`, "",
      "Terms & conditions: A 3% processing fee applies to credit card payments.",
      ...(comparison.client_message.trim() ? ["", comparison.client_message.trim()] : []), "",
      "The full branded quote is attached as a PDF.", "", "Avantia Build", companyEmail, "(516) 908-8319", "https://build.avantiap.com",
    ].join("\n")
    const htmlRows = items.map((item) => `<tr><td style="border-bottom:1px solid #e5eaf1"><strong>${escapeHtml(item.description)}</strong>${item.specification ? `<br><span style="color:#64748b">${escapeHtml(item.specification)}</span>` : ""}</td><td style="border-bottom:1px solid #e5eaf1">${item.quantity} ${escapeHtml(item.unit)}</td><td style="border-bottom:1px solid #e5eaf1;text-align:right">${money(item.lineTotal)}</td></tr>`).join("")
    const html = `<div style="margin:0;background:#eef2f6;padding:24px 10px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.55"><div style="max-width:680px;margin:0 auto;border:1px solid #dbe3ee;border-radius:14px;background:#fff;overflow:hidden"><div style="padding:18px 22px;border-bottom:1px solid #e5eaf1"><strong style="font-size:20px">Avantia Build</strong></div><div style="padding:24px 22px"><p style="color:#06c;font-size:12px;font-weight:700;text-transform:uppercase">Material quote</p><h1>Your quote is ready</h1><p>Hi ${escapeHtml(comparison.client_name_snapshot || "Client")}, we prepared quote <strong>${escapeHtml(comparison.quote_number)}</strong>.</p><p><strong>Job location:</strong> ${escapeHtml(comparison.job_address || "Not provided")}</p><table cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#071126;color:#fff;text-align:left"><th>Material</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead><tbody>${htmlRows}</tbody></table><div style="margin-top:18px;text-align:right;color:#475569">${delivery > 0 ? `<div>Delivery: ${money(delivery)}</div>` : ""}<div>Sales tax (${taxPercent.toFixed(3)}%): ${money(tax)}</div><div style="margin-top:5px;font-size:19px;font-weight:700;color:#071126">Total: ${money(total)}</div></div>${comparison.client_message.trim() ? `<p style="margin-top:22px;white-space:pre-wrap">${escapeHtml(comparison.client_message.trim())}</p>` : ""}<p style="margin-top:22px;border-top:1px solid #e5eaf1;padding-top:16px"><strong>Terms &amp; conditions</strong><br>A 3% processing fee applies to credit card payments.</p><p>The complete quote is attached as a PDF. Reply with any questions.</p></div><div style="padding:18px 22px;border-top:1px solid #e5eaf1;background:#f8fafc"><strong>Avantia Build</strong><br>${companyEmail} · (516) 908-8319</div></div></div>`

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json", "idempotency-key": `avantia-client-quote-${comparison.id}-${deliveryId}` },
        body: JSON.stringify({
          from: Deno.env.get("QUOTE_SUBMISSION_FROM") || `Avantia Build <${companyEmail}>`,
          to: [recipientEmail], subject, html, text, reply_to: companyEmail,
          attachments: emailAttachments,
        }),
      })
      const result = await response.json().catch(() => null) as { id?: string; message?: string; error?: string } | null
      if (!response.ok) return json({ error: result?.message || result?.error || `Email provider returned ${response.status}` }, 502)
      console.log("client_quote_email", { comparisonId: comparison.id, status: "sent" })
      return json({ ok: true, providerId: result?.id || null })
    } catch (cause) {
      return json({ error: cause instanceof Error ? cause.message : "Email provider could not be reached" }, 502)
    }
  }

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

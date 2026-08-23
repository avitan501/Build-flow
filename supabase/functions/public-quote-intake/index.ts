import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

type QuotePayload = {
  requestKind?: "quote_request" | "beat_quote"
  referenceId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  customerType: string
  projectName: string
  projectType: string
  street: string
  city: string
  state: string
  zip: string
  timeframe: string
  departments: string[]
  details: string
  attachment?: { filename: string; content?: string; storagePath?: string; type: string; size?: number }
}

type EmailDeliveryResult =
  | { status: "sent"; providerId: string | null }
  | { status: "not_configured" }
  | { status: "failed"; error: string }

type EmailActionPayload =
  | { action: "send_manager_reply"; requestId?: string; message?: string; items?: CustomerEmailItem[] }
  | { action: "send_quote_notifications"; requestId?: string; quote?: QuotePayload; sendOwner?: boolean; sendClient?: boolean }
  | { action: "send_order_notifications"; order?: OrderNotificationPayload; sendOwner?: boolean; sendClient?: boolean }
  | { action: "prepare_upload"; filename?: string; type?: string; size?: number }

type OrderNotificationPayload = {
  quoteId: string
  project: { name: string; address?: string | null }
  customer: { email?: string | null; profile?: { email?: string | null; full_name?: string | null; phone?: string | null; company_name?: string | null } | null }
  quoteItems: Array<{ name: string; quantity: number; unit: string; line_total: number }>
  subtotal: number
  tax: number
  total: number
}

type CustomerEmailItem = {
  name: string
  quantity?: number | null
  unit?: string | null
  details?: string[]
}

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])
const maxInlineFileSize = 4 * 1024 * 1024
const maxStoredFileSize = 25 * 1024 * 1024
const temporaryUploadPrefix = "public-intake/"
const siteUrl = "https://build.avantiap.com"
const companyEmail = "office@build.avantiap.com"
const companyPhone = "(516) 908-8319"
const companyPhoneLink = "tel:+15169088319"
const companyWhatsAppUrl = "https://wa.me/15169088319"
const customerEmailLogoUrl = `${siteUrl}/images/avantia/avantia-build-rain-painter-animation.gif`
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json" } })
}

function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodeBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 32_768
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(value) ? value : 0)
}

function companyContactText() {
  return ["Avantia Build", "Everything it takes to build", companyEmail, companyPhone, siteUrl, `WhatsApp: ${companyWhatsAppUrl}`].join("\n")
}

function itemQuantity(item: CustomerEmailItem) {
  if (item.quantity === null || item.quantity === undefined) return ""
  return `${item.quantity} ${item.unit?.trim() || "item"}`
}

function requestedItemsText(items: CustomerEmailItem[], emptyLabel = "See the request details or attached file.") {
  if (!items.length) return emptyLabel
  return items.flatMap((item) => [
    `- ${item.name}${itemQuantity(item) ? `: ${itemQuantity(item)}` : ""}`,
    ...(item.details ?? []).filter(Boolean).map((detail) => `  ${detail}`),
  ]).join("\n")
}

function requestedItemsHtml(items: CustomerEmailItem[], emptyLabel = "See the request details or attached file.") {
  if (!items.length) return `<p style="margin:8px 0 0;color:#64748b">${escapeHtml(emptyLabel)}</p>`
  return `<div style="margin-top:10px;border:1px solid #dbe3ee;border-radius:10px;overflow:hidden">${items.map((item, index) => `<div style="padding:13px 14px;${index ? "border-top:1px solid #e5eaf1;" : ""}background:${index % 2 ? "#f8fafc" : "#ffffff"}"><strong style="color:#071126">${escapeHtml(item.name)}</strong>${itemQuantity(item) ? `<br><span style="color:#475569">${escapeHtml(itemQuantity(item))}</span>` : ""}${item.details?.length ? `<ul style="margin:7px 0 0;padding-left:18px;color:#475569">${item.details.filter(Boolean).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div>`
}

function customerEmailShell(content: string) {
  return `<div style="margin:0;background:#eef2f6;padding:24px 10px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.55"><div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:14px;background:#ffffff"><div style="padding:18px 22px;border-bottom:1px solid #e5eaf1;background:#ffffff"><a href="${siteUrl}" style="display:inline-block;text-decoration:none"><img src="${customerEmailLogoUrl}" width="280" alt="Avantia Build" style="display:block;width:100%;max-width:280px;height:auto;border:0"></a></div><div style="padding:24px 22px">${content}</div><div style="padding:18px 22px;border-top:1px solid #e5eaf1;background:#f8fafc;color:#475569;font-size:13px;line-height:1.65"><strong style="color:#071126;font-size:15px">Avantia Build</strong><br><span>Everything it takes to build</span><br><a href="${siteUrl}" style="color:#0066cc;text-decoration:none">build.avantiap.com</a><br><a href="mailto:${companyEmail}" style="color:#0066cc;text-decoration:none">${companyEmail}</a><br><a href="${companyPhoneLink}" style="color:#0066cc;text-decoration:none">${companyPhone}</a><span style="color:#94a3b8"> &middot; </span><a href="${companyWhatsAppUrl}" style="color:#0066cc;text-decoration:none">WhatsApp us</a></div></div></div>`
}

async function sendEmail(input: { to: string; subject: string; html: string; text: string; replyTo?: string; attachment?: QuotePayload["attachment"] }) {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) return { status: "not_configured" } satisfies EmailDeliveryResult
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("QUOTE_SUBMISSION_FROM") || "Avantia Build Requests <onboarding@resend.dev>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        attachments: input.attachment?.content ? [{ filename: input.attachment.filename, content: input.attachment.content }] : undefined,
      }),
    })
    const body = await response.json().catch(() => null) as { id?: string; message?: string; error?: string } | null
    if (!response.ok) return { status: "failed", error: body?.message || body?.error || `Resend returned ${response.status}` } satisfies EmailDeliveryResult
    return { status: "sent", providerId: body?.id ?? null } satisfies EmailDeliveryResult
  } catch (cause) {
    return { status: "failed", error: cause instanceof Error ? cause.message : "Email provider could not be reached" } satisfies EmailDeliveryResult
  }
}

function valid(payload: QuotePayload) {
  return payload.referenceId?.startsWith("AB-")
    && payload.firstName?.length > 0
    && payload.lastName?.length > 0
    && /^\S+@\S+\.\S+$/.test(payload.email || "")
    && (!(payload.phone || "").trim() || payload.phone.replace(/\D/g, "").length >= 7)
    && Array.isArray(payload.departments)
    && ((payload.details || "").trim().length >= 3 || Boolean(payload.attachment))
}

function hasValidPublicKey(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
  const legacyKey = Deno.env.get("SUPABASE_ANON_KEY") || ""
  let publishableKeys: string[] = []
  try {
    const configured = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}") as Record<string, unknown>
    publishableKeys = Object.values(configured).flatMap((value) => typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).filter((item): item is string => typeof item === "string") : [])
  } catch {
    publishableKeys = []
  }
  return Boolean(token) && (token === legacyKey || publishableKeys.includes(token))
}

function hasServiceRoleKey(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
  return Boolean(token) && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
}

function hasBearerToken(request: Request) {
  return Boolean(request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""))
}

async function organizeClientMaterialList(supabaseUrl: string, serviceRoleKey: string, requestId: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/client-material-list-ai`, {
      method: "POST",
      headers: { authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
      body: JSON.stringify({ requestId }),
    })
    if (!response.ok) console.error("client_material_list_ai_failed", { requestId, status: response.status })
  } catch (cause) {
    console.error("client_material_list_ai_failed", { requestId, reason: cause instanceof Error ? cause.message : "unknown" })
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)
  const serviceRoleRequest = hasServiceRoleKey(request)
  const publicKeyRequest = hasValidPublicKey(request)
  if (!serviceRoleRequest && !publicKeyRequest && !hasBearerToken(request)) return json({ error: "unauthorized" }, 401)

  let rawPayload: QuotePayload | EmailActionPayload
  try {
    rawPayload = await request.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }

  if (!("action" in rawPayload) && !serviceRoleRequest && !publicKeyRequest) return json({ error: "unauthorized" }, 401)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "service_unavailable" }, 503)

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  if ("action" in rawPayload && rawPayload.action === "send_manager_reply") {
    if (!serviceRoleRequest) return json({ error: "forbidden" }, 403)
    const requestId = String(rawPayload.requestId || "")
    const message = String(rawPayload.message || "").trim().slice(0, 5000)
    const items = Array.isArray(rawPayload.items)
      ? rawPayload.items.slice(0, 100).map((item) => ({
          name: String(item.name || "Material item").slice(0, 300),
          quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : null,
          unit: item.unit ? String(item.unit).slice(0, 80) : null,
          details: Array.isArray(item.details) ? item.details.map((detail) => String(detail).slice(0, 1000)).slice(0, 100) : [],
        }))
      : []
    if (!requestId || message.length < 2) return json({ error: "invalid_request" }, 400)

    const { data: quoteRequest } = await supabase.from("quote_requests").select("title,owner_id").eq("id", requestId).maybeSingle<{ title: string; owner_id: string }>()
    if (!quoteRequest) return json({ error: "request_not_found" }, 404)
    const { data: recipient } = await supabase.from("profiles").select("email,full_name").eq("id", quoteRequest.owner_id).maybeSingle<{ email: string | null; full_name: string | null }>()
    if (!recipient?.email) return json({ error: "client_email_not_found" }, 404)

    const result = await sendEmail({
      to: recipient.email,
      subject: `Avantia Build request: ${quoteRequest.title}`,
      replyTo: companyEmail,
      text: `${message}\n\nRequest: ${quoteRequest.title}\n\nMaterials requested:\n${requestedItemsText(items)}\n\n${companyContactText()}`,
      html: customerEmailShell(`<p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request update</p><h1 style="margin:0;font-size:24px;line-height:1.25;color:#071126">${escapeHtml(quoteRequest.title)}</h1><p style="margin:16px 0;white-space:pre-wrap;color:#334155">${escapeHtml(message)}</p><h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>${requestedItemsHtml(items)}`),
    })
    console.log("manager_reply_email", { requestId, status: result.status })
    return json({ result })
  }

  if ("action" in rawPayload && rawPayload.action === "send_order_notifications") {
    let order = rawPayload.order
    if (!order?.quoteId || !order.project?.name || !Array.isArray(order.quoteItems)) return json({ error: "invalid_request" }, 400)

    if (!serviceRoleRequest) {
      const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
      const { data: authenticated, error: authenticationError } = await supabase.auth.getUser(token)
      if (authenticationError || !authenticated.user) return json({ error: "forbidden" }, 403)

      const { data: ownedRequest } = await supabase
        .from("quote_requests")
        .select("id,project_id")
        .eq("id", order.quoteId)
        .eq("owner_id", authenticated.user.id)
        .maybeSingle<{ id: string; project_id: string }>()
      if (!ownedRequest) return json({ error: "forbidden" }, 403)

      const [{ data: project }, { data: profile }] = await Promise.all([
        supabase.from("projects").select("name,address").eq("id", ownedRequest.project_id).eq("owner_id", authenticated.user.id).maybeSingle<{ name: string; address: string | null }>(),
        supabase.from("profiles").select("email,full_name,phone,company_name").eq("id", authenticated.user.id).maybeSingle<{ email: string | null; full_name: string | null; phone: string | null; company_name: string | null }>(),
      ])
      if (!project) return json({ error: "project_not_found" }, 404)

      const verifiedEmail = authenticated.user.email || profile?.email || null
      order = {
        ...order,
        project: { name: project.name, address: project.address },
        customer: {
          email: verifiedEmail,
          profile: {
            email: verifiedEmail,
            full_name: profile?.full_name || authenticated.user.user_metadata?.full_name || null,
            phone: profile?.phone || null,
            company_name: profile?.company_name || null,
          },
        },
      }
    }

    const clientEmail = order.customer?.email || order.customer?.profile?.email || ""
    const clientName = order.customer?.profile?.full_name || "Client"
    const itemLines = order.quoteItems.map((item) => `- ${item.name}: ${item.quantity} ${item.unit} = ${money(item.line_total)}`)
    const customerItems: CustomerEmailItem[] = order.quoteItems.map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit }))
    const ownerText = ["New Avantia Build order request", `Quote ID: ${order.quoteId}`, `Project: ${order.project.name}`, `Address: ${order.project.address || "Not provided"}`, `Customer: ${clientName}`, `Email: ${clientEmail || "Not provided"}`, `Phone: ${order.customer?.profile?.phone || "Not provided"}`, "", "Items:", ...itemLines, "", `Total: ${money(order.total)}`].join("\n")
    const owner = rawPayload.sendOwner === false
      ? { status: "skipped" as const }
      : await sendEmail({
          to: "avitanneto@gmail.com",
          subject: `New Avantia Build request: ${order.project.name}`,
          replyTo: clientEmail || undefined,
          text: ownerText,
          html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:680px;margin:auto"><p style="color:#0066cc;font-size:12px;font-weight:700">AVANTIA BUILD ORDER REQUEST</p><h1 style="font-size:24px">${escapeHtml(order.project.name)}</h1><p><strong>Quote ID:</strong> ${escapeHtml(order.quoteId)}<br><strong>Address:</strong> ${escapeHtml(order.project.address || "Not provided")}<br><strong>Customer:</strong> ${escapeHtml(clientName)}<br><strong>Email:</strong> ${escapeHtml(clientEmail || "Not provided")}<br><strong>Phone:</strong> ${escapeHtml(order.customer?.profile?.phone || "Not provided")}</p><h2 style="font-size:17px">Items</h2><ul>${order.quoteItems.map((item) => `<li>${escapeHtml(item.name)}: ${item.quantity} ${escapeHtml(item.unit)} = ${money(item.line_total)}</li>`).join("")}</ul><p><strong>Total:</strong> ${money(order.total)}</p></div>`,
        })
    const client = rawPayload.sendClient === false || !clientEmail
      ? { status: "skipped" as const }
      : await sendEmail({
          to: clientEmail,
          subject: `We received your Avantia Build request: ${order.project.name}`,
          replyTo: companyEmail,
          text: `Hi ${clientName},\n\nWe received your request for ${order.project.name}. Our team will review it and contact you if anything else is needed.\n\nQuote ID: ${order.quoteId}\n\nMaterials requested:\n${requestedItemsText(customerItems)}\n\n${companyContactText()}`,
          html: customerEmailShell(`<p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request received</p><h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">We received your request</h1><p style="margin:12px 0;color:#475569">Hi ${escapeHtml(clientName)}, our team will review the details and contact you if anything else is needed.</p><div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc"><strong>Project:</strong> ${escapeHtml(order.project.name)}<br><strong>Request ID:</strong> ${escapeHtml(order.quoteId)}</div><h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>${requestedItemsHtml(customerItems)}`),
        })
    console.log("order_notification_email", { quoteId: order.quoteId, owner: owner.status, client: client.status })
    return json({ owner, client })
  }

  if ("action" in rawPayload && rawPayload.action === "send_quote_notifications") {
    if (!serviceRoleRequest) return json({ error: "forbidden" }, 403)
    const payload = rawPayload.quote
    if (!payload || !valid(payload)) return json({ error: "invalid_request" }, 400)

    let attachment: QuotePayload["attachment"] | undefined
    if (rawPayload.sendOwner !== false && rawPayload.requestId) {
      const { data: storedAttachment } = await supabase
        .from("quote_request_attachments")
        .select("file_name,file_path,file_type,file_size")
        .eq("request_id", rawPayload.requestId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<{ file_name: string; file_path: string; file_type: string; file_size: number }>()
      if (storedAttachment && storedAttachment.file_size <= maxStoredFileSize) {
        const { data: file } = await supabase.storage.from("project-uploads").download(storedAttachment.file_path)
        if (file) attachment = { filename: storedAttachment.file_name, type: storedAttachment.file_type, size: storedAttachment.file_size, content: encodeBase64(new Uint8Array(await file.arrayBuffer())) }
      }
    }

    const fullName = `${payload.firstName} ${payload.lastName}`.trim()
    const address = [payload.street, payload.city, payload.state, payload.zip].filter(Boolean).join(", ")
    const departmentText = payload.departments.join(", ") || "Not selected"
    const customerItems: CustomerEmailItem[] = [{ name: departmentText, details: [payload.details || "See the attached file."] }]
    const requestUrl = rawPayload.requestId
      ? `${siteUrl}/owner/materials/requests/${encodeURIComponent(rawPayload.requestId)}`
      : `${siteUrl}/owner/materials/requests`
    const ownerText = ["New Avantia Build quote request", `Reference: ${payload.referenceId}`, `Customer: ${fullName}`, `Email: ${payload.email}`, `Phone: ${payload.phone || "Not provided"}`, `Company: ${payload.company || "Not provided"}`, `Project: ${payload.projectName || "Not named"}`, `Address: ${address || "Not provided"}`, `Departments: ${departmentText}`, `Needed: ${payload.timeframe || "Not provided"}`, "", payload.details || "See request in the manager portal"].join("\n")
    const owner = rawPayload.sendOwner === false
      ? { status: "skipped" as const }
      : await sendEmail({
          to: "avitanneto@gmail.com",
          subject: `NEW MATERIAL REQUEST - ${fullName} - ${payload.referenceId}`,
          replyTo: payload.email,
          text: ownerText,
          html: `<div style="margin:0;background:#f2f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5"><div style="max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:16px;background:#ffffff"><div style="padding:20px 22px;border-bottom:1px solid #e5eaf1"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px"><img src="${siteUrl}/images/avantia/avantia-app-icon-512.png" width="46" height="46" alt="" style="display:block;border-radius:12px"></td><td><strong style="font-size:18px;color:#071126">Avantia Build</strong><br><span style="font-size:13px;color:#64748b">Material request desk</span></td></tr></table></div><div style="padding:24px 22px"><p style="margin:0 0 8px;color:#0071e3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">New material request</p><h1 style="margin:0;font-size:26px;line-height:1.2;color:#071126">${escapeHtml(fullName)} sent a request</h1><p style="margin:10px 0 0;color:#475569">${escapeHtml(departmentText)}${payload.timeframe ? ` &bull; Needed ${escapeHtml(payload.timeframe)}` : ""}</p><p style="margin:22px 0"><a href="${requestUrl}" style="display:inline-block;border-radius:8px;background:#0071e3;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open Request</a></p><div style="padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc"><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}<br><strong>Customer:</strong> ${escapeHtml(fullName)}<br><strong>Phone:</strong> ${escapeHtml(payload.phone || "Not provided")}<br><strong>Email:</strong> ${escapeHtml(payload.email)}${payload.company ? `<br><strong>Company:</strong> ${escapeHtml(payload.company)}` : ""}</div><h2 style="margin:24px 0 8px;font-size:17px">Job details</h2><p style="margin:0"><strong>Location:</strong> ${escapeHtml(address || "Not provided")}<br><strong>Departments:</strong> ${escapeHtml(departmentText)}</p><h2 style="margin:24px 0 8px;font-size:17px">What they need</h2><p style="margin:0;white-space:pre-wrap">${escapeHtml(payload.details || "See attached file")}</p>${attachment?.filename ? `<p style="margin:20px 0 0;color:#475569;font-size:13px"><strong>Attached:</strong> ${escapeHtml(attachment.filename)}</p>` : ""}</div></div></div>`,
          attachment,
        })
    const client = rawPayload.sendClient === false
      ? { status: "skipped" as const }
      : await sendEmail({
          to: payload.email,
          subject: `Material request received - ${payload.referenceId}`,
          replyTo: companyEmail,
          text: `Hi ${payload.firstName},\n\nWe received your Avantia Build quote request. Someone from our team will contact you within the next 24 hours.\n\nReference: ${payload.referenceId}\n\nMaterials requested:\n${requestedItemsText(customerItems)}${payload.attachment?.filename ? `\nAttachment: ${payload.attachment.filename}` : ""}\n\n${companyContactText()}`,
          html: customerEmailShell(`<p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request received</p><h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">Your request is in.</h1><p style="margin:12px 0;color:#475569">Hi ${escapeHtml(payload.firstName)}, we will review your details and contact you within 24 hours.</p><div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc"><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}</div><h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>${requestedItemsHtml(customerItems)}${payload.attachment?.filename ? `<p style="margin:14px 0 0;color:#475569;font-size:13px"><strong>Attached:</strong> ${escapeHtml(payload.attachment.filename)}</p>` : ""}<p style="margin:22px 0 0"><a href="${siteUrl}" style="display:inline-block;border-radius:8px;background:#0071e3;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open Avantia Build</a></p>`),
        })
    console.log("quote_notification_email", { referenceId: payload.referenceId, owner: owner.status, client: client.status })
    return json({ owner, client })
  }

  if ("action" in rawPayload && rawPayload.action === "prepare_upload") {
    const size = Number(rawPayload.size)
    const type = String(rawPayload.type || "")
    const filename = String(rawPayload.filename || "").replace(/[^a-zA-Z0-9._ -]+/g, "-").slice(0, 100) || "project-file"
    if (!allowedTypes.has(type)) return json({ error: "invalid_file_type" }, 400)
    if (!Number.isFinite(size) || size <= 0 || size > maxStoredFileSize) return json({ error: "file_too_large" }, 400)
    const extension = filename.split(".").pop()?.toLowerCase()
    const expectedType = extension === "pdf" ? "application/pdf" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : ""
    if (expectedType !== type) return json({ error: "invalid_file_type" }, 400)
    const path = `${temporaryUploadPrefix}${crypto.randomUUID()}-${filename}`
    const { data, error } = await supabase.storage.from("project-uploads").createSignedUploadUrl(path)
    if (error || !data) return json({ error: "upload_preparation_failed" }, 500)
    return json({ ok: true, path: data.path, token: data.token })
  }

  const payload = rawPayload as QuotePayload
  if (!valid(payload)) return json({ error: "invalid_request" }, 400)
  const fullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`
  const email = payload.email.trim().toLowerCase()
  const address = [payload.street, payload.city, payload.state, payload.zip].map((value) => value?.trim()).filter(Boolean).join(", ")
  let clientId = ""
  let projectId = ""
  let requestId = ""
  let storedFilePath = ""
  let createdClient = false

  try {
    const { data: profile } = await supabase.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle<{ id: string }>()
    if (profile) {
      clientId = profile.id
      const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: payload.phone || null, company_name: payload.company || null }).eq("id", clientId)
      if (error) throw new Error("profile_update_failed")
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: `${crypto.randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone: payload.phone || null, company_name: payload.company || null },
      })
      if (error || !data.user) throw new Error("client_create_failed")
      clientId = data.user.id
      createdClient = true
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: clientId,
        email,
        full_name: fullName,
        phone: payload.phone || null,
        company_name: payload.company || null,
        role: "client",
        approval_status: "pending",
        is_active: true,
      }, { onConflict: "id" })
      if (profileError) throw new Error("profile_create_failed")
    }

    const { data: project, error: projectError } = await supabase.from("projects").insert({
      owner_id: clientId,
      name: payload.projectName?.trim() || `Quote request ${payload.referenceId}`,
      address: address || null,
      status: "active",
    }).select("id").single<{ id: string }>()
    if (projectError || !project) throw new Error("project_create_failed")
    projectId = project.id

    const { data: quote, error: requestError } = await supabase.from("quote_requests").insert({
      project_id: projectId,
      owner_id: clientId,
      title: payload.projectName?.trim() ? `${payload.projectName.trim()} quote request` : `Construction quote ${payload.referenceId}`,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).select("id").single<{ id: string }>()
    if (requestError || !quote) throw new Error("request_create_failed")
    requestId = quote.id

    const answers = [
      ...(payload.customerType ? [{ questionId: "customer_type", label: "Customer type", value: payload.customerType }] : []),
      ...(payload.projectType ? [{ questionId: "project_type", label: "Project type", value: payload.projectType }] : []),
      ...(payload.timeframe ? [{ questionId: "timeframe", label: "Materials needed", value: payload.timeframe }] : []),
      ...(payload.departments.length ? [{ questionId: "departments", label: "Departments", value: payload.departments.join(", ") }] : []),
      { questionId: "request_details", label: "Request details", value: payload.details },
    ]
    const { error: itemError } = await supabase.from("quote_request_items").insert({
      request_id: requestId,
      project_id: projectId,
      owner_id: clientId,
      name: "Construction quote request",
      department: payload.departments.join(", ") || "General request",
      item_type: "custom_priced",
      quantity: 1,
      unit: "request",
      unit_price: 0,
      qualification_status: "answered",
      answers,
      metadata: { reference_id: payload.referenceId, source: "public_quote_form", request_details: payload.details },
    })
    if (itemError) throw new Error("request_item_create_failed")

    if (payload.attachment?.storagePath) {
      const temporaryPath = payload.attachment.storagePath
      const statedSize = Number(payload.attachment.size)
      if (!temporaryPath.startsWith(temporaryUploadPrefix) || temporaryPath.includes("..") || !allowedTypes.has(payload.attachment.type)) throw new Error("invalid_attachment")
      const { data: fileInfo, error: infoError } = await supabase.storage.from("project-uploads").info(temporaryPath)
      if (infoError || !fileInfo || !Number.isFinite(statedSize) || statedSize <= 0 || fileInfo.size !== statedSize || fileInfo.size > maxStoredFileSize || fileInfo.contentType !== payload.attachment.type) throw new Error("invalid_attachment")
      const { data: emailFile, error: downloadError } = await supabase.storage.from("project-uploads").download(temporaryPath)
      if (downloadError || !emailFile) throw new Error("attachment_download_failed")
      payload.attachment.content = encodeBase64(new Uint8Array(await emailFile.arrayBuffer()))
      const filename = payload.attachment.filename.replace(/[^a-zA-Z0-9._ -]+/g, "-").slice(0, 100) || "project-file"
      storedFilePath = `${clientId}/${projectId}/${crypto.randomUUID()}-${filename}`
      const { error: moveError } = await supabase.storage.from("project-uploads").move(temporaryPath, storedFilePath)
      if (moveError) throw new Error("attachment_move_failed")
      const { error: attachmentError } = await supabase.from("quote_request_attachments").insert({
        request_id: requestId,
        project_id: projectId,
        owner_id: clientId,
        file_name: filename,
        file_path: storedFilePath,
        file_type: payload.attachment.type,
        file_size: statedSize,
      })
      if (attachmentError) throw new Error("attachment_record_failed")
    } else if (payload.attachment?.content) {
      if (!allowedTypes.has(payload.attachment.type)) throw new Error("invalid_attachment")
      const bytes = decodeBase64(payload.attachment.content)
      if (bytes.byteLength > maxInlineFileSize) throw new Error("attachment_too_large")
      const filename = payload.attachment.filename.replace(/[^a-zA-Z0-9._ -]+/g, "-").slice(0, 100) || "project-file"
      storedFilePath = `${clientId}/${projectId}/${crypto.randomUUID()}-${filename}`
      const { error: uploadError } = await supabase.storage.from("project-uploads").upload(storedFilePath, bytes, { contentType: payload.attachment.type, upsert: false })
      if (uploadError) throw new Error("attachment_upload_failed")
      const { error: attachmentError } = await supabase.from("quote_request_attachments").insert({
        request_id: requestId,
        project_id: projectId,
        owner_id: clientId,
        file_name: filename,
        file_path: storedFilePath,
        file_type: payload.attachment.type,
        file_size: bytes.byteLength,
      })
      if (attachmentError) throw new Error("attachment_record_failed")
    }

    const departmentText = payload.departments.join(", ") || "Not selected"
    const requestUrl = `${siteUrl}/owner/materials/requests/${encodeURIComponent(requestId)}`
    const customerItems: CustomerEmailItem[] = [{ name: departmentText, details: [payload.details || "See the attached file."] }]
    const ownerText = [
      "New Avantia Build quote request",
      `Reference: ${payload.referenceId}`,
      `Customer: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${payload.phone || "Not provided"}`,
      `Company: ${payload.company || "Not provided"}`,
      `Project: ${payload.projectName || "Not named"}`,
      `Address: ${address || "Not provided"}`,
      `Departments: ${departmentText}`,
      `Needed: ${payload.timeframe || "Not provided"}`,
      "",
      payload.details,
    ].join("\n")
    const ownerEmail = await sendEmail({
      to: "avitanneto@gmail.com",
      subject: `NEW MATERIAL REQUEST - ${fullName} - ${payload.referenceId}`,
      replyTo: email,
      text: ownerText,
      html: `<div style="margin:0;background:#f2f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5"><div style="max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:16px;background:#ffffff"><div style="padding:20px 22px;border-bottom:1px solid #e5eaf1"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px"><img src="${siteUrl}/images/avantia/avantia-app-icon-512.png" width="46" height="46" alt="" style="display:block;border-radius:12px"></td><td><strong style="font-size:18px;color:#071126">Avantia Build</strong><br><span style="font-size:13px;color:#64748b">Material request desk</span></td></tr></table></div><div style="padding:24px 22px"><p style="margin:0 0 8px;color:#0071e3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">New material request</p><h1 style="margin:0;font-size:26px;line-height:1.2;color:#071126">${escapeHtml(fullName)} sent a request</h1><p style="margin:10px 0 0;color:#475569">${escapeHtml(departmentText)}${payload.timeframe ? ` &bull; Needed ${escapeHtml(payload.timeframe)}` : ""}</p><p style="margin:22px 0"><a href="${requestUrl}" style="display:inline-block;border-radius:8px;background:#0071e3;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open Request</a></p><div style="padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc"><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}<br><strong>Customer:</strong> ${escapeHtml(fullName)}<br><strong>Phone:</strong> ${escapeHtml(payload.phone || "Not provided")}<br><strong>Email:</strong> ${escapeHtml(email)}${payload.company ? `<br><strong>Company:</strong> ${escapeHtml(payload.company)}` : ""}</div><h2 style="margin:24px 0 8px;font-size:17px">Job details</h2><p style="margin:0"><strong>Location:</strong> ${escapeHtml(address || "Not provided")}<br><strong>Departments:</strong> ${escapeHtml(departmentText)}</p><h2 style="margin:24px 0 8px;font-size:17px">What they need</h2><p style="margin:0;white-space:pre-wrap">${escapeHtml(payload.details || "See attached file")}</p>${payload.attachment?.filename ? `<p style="margin:20px 0 0;color:#475569;font-size:13px"><strong>Attached:</strong> ${escapeHtml(payload.attachment.filename)}</p>` : ""}</div></div></div>`,
      attachment: payload.attachment,
    })
    const clientText = `Hi ${payload.firstName},\n\nWe received your Avantia Build quote request. Someone from our team will contact you within the next 24 hours.\n\nReference: ${payload.referenceId}\nProject: ${payload.projectName || "Not named"}\n\nMaterials requested:\n${requestedItemsText(customerItems)}${payload.attachment?.filename ? `\nAttachment: ${payload.attachment.filename}` : ""}\n\n${companyContactText()}`
    const clientEmail = await sendEmail({
      to: email,
      subject: `Material request received - ${payload.referenceId}`,
      replyTo: companyEmail,
      text: clientText,
      html: customerEmailShell(`<p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request received</p><h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">Your request is in.</h1><p style="margin:12px 0;color:#475569">Hi ${escapeHtml(payload.firstName)}, we will review your details and contact you within 24 hours.</p><div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc"><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}${payload.projectName ? `<br><strong>Project:</strong> ${escapeHtml(payload.projectName)}` : ""}</div><h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>${requestedItemsHtml(customerItems)}${payload.attachment?.filename ? `<p style="margin:14px 0 0;color:#475569;font-size:13px"><strong>Attached:</strong> ${escapeHtml(payload.attachment.filename)}</p>` : ""}<p style="margin:22px 0 0"><a href="${siteUrl}" style="display:inline-block;border-radius:8px;background:#0071e3;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open Avantia Build</a></p>`),
    })

    await supabase.from("quote_request_items").update({
      metadata: {
        reference_id: payload.referenceId,
        source: "public_quote_form",
        request_details: payload.details,
        email_delivery: {
          owner: ownerEmail.status,
          client: clientEmail.status,
          checked_at: new Date().toISOString(),
        },
      },
    }).eq("request_id", requestId)

    if (payload.requestKind !== "beat_quote") {
      EdgeRuntime.waitUntil(organizeClientMaterialList(supabaseUrl, serviceRoleKey, requestId))
    }

    return json({ ok: true, clientId, projectId, requestId, referenceId: payload.referenceId, email: { owner: ownerEmail, client: clientEmail } })
  } catch (cause) {
    if (storedFilePath) await supabase.storage.from("project-uploads").remove([storedFilePath])
    if (projectId) await supabase.from("projects").delete().eq("id", projectId)
    if (createdClient && clientId) await supabase.auth.admin.deleteUser(clientId)
    console.error("public_quote_intake_failed", cause instanceof Error ? cause.message : "unknown")
    return json({ error: "save_failed" }, 500)
  }
})

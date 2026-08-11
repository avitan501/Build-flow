import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

type QuotePayload = {
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
  | { action: "send_manager_reply"; requestId?: string; message?: string }
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

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])
const maxInlineFileSize = 4 * 1024 * 1024
const maxStoredFileSize = 25 * 1024 * 1024
const temporaryUploadPrefix = "public-intake/"
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

async function sendEmail(input: { to: string; subject: string; html: string; text: string; replyTo?: string; attachment?: QuotePayload["attachment"] }) {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) return { status: "not_configured" } satisfies EmailDeliveryResult
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("QUOTE_SUBMISSION_FROM") || "Avantia Build <onboarding@resend.dev>",
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
    if (!requestId || message.length < 2) return json({ error: "invalid_request" }, 400)

    const { data: quoteRequest } = await supabase.from("quote_requests").select("title,owner_id").eq("id", requestId).maybeSingle<{ title: string; owner_id: string }>()
    if (!quoteRequest) return json({ error: "request_not_found" }, 404)
    const { data: recipient } = await supabase.from("profiles").select("email,full_name").eq("id", quoteRequest.owner_id).maybeSingle<{ email: string | null; full_name: string | null }>()
    if (!recipient?.email) return json({ error: "client_email_not_found" }, 404)

    const ownerEmail = "avitanneto@gmail.com"
    const result = await sendEmail({
      to: recipient.email,
      subject: `Avantia Build request: ${quoteRequest.title}`,
      replyTo: ownerEmail,
      text: `${message}\n\nAvantia Build\nEverything it takes to build`,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:620px;margin:0 auto"><p style="white-space:pre-wrap">${escapeHtml(message)}</p><div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0"><strong>Avantia Build</strong><br><span style="color:#64748b">Everything it takes to build</span><br><span style="color:#64748b;font-size:13px">Request: ${escapeHtml(quoteRequest.title)}</span></div></div>`,
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
          replyTo: "avitanneto@gmail.com",
          text: `Hi ${clientName},\n\nWe received your request for ${order.project.name}. Our team will review it and contact you if anything else is needed.\n\nQuote ID: ${order.quoteId}\n\nAvantia Build`,
          html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:auto"><p>Hi ${escapeHtml(clientName)},</p><h1 style="font-size:22px">We received your request</h1><p>Our team will review the details and contact you if anything else is needed.</p><p><strong>Project:</strong> ${escapeHtml(order.project.name)}<br><strong>Quote ID:</strong> ${escapeHtml(order.quoteId)}</p><p style="margin-top:24px"><strong>Avantia Build</strong></p></div>`,
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
    const ownerText = ["New Avantia Build quote request", `Reference: ${payload.referenceId}`, `Customer: ${fullName}`, `Email: ${payload.email}`, `Phone: ${payload.phone || "Not provided"}`, `Company: ${payload.company || "Not provided"}`, `Project: ${payload.projectName || "Not named"}`, `Address: ${address || "Not provided"}`, `Departments: ${departmentText}`, `Needed: ${payload.timeframe || "Not provided"}`, "", payload.details || "See request in the manager portal"].join("\n")
    const owner = rawPayload.sendOwner === false
      ? { status: "skipped" as const }
      : await sendEmail({
          to: "avitanneto@gmail.com",
          subject: `New quote request: ${payload.projectName || fullName}`,
          replyTo: payload.email,
          text: ownerText,
          html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:680px;margin:auto"><p style="color:#0066cc;font-size:12px;font-weight:700">AVANTIA BUILD QUOTE REQUEST</p><h1 style="font-size:24px">${escapeHtml(payload.projectName || "New construction request")}</h1><p><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}<br><strong>Customer:</strong> ${escapeHtml(fullName)}<br><strong>Email:</strong> ${escapeHtml(payload.email)}<br><strong>Phone:</strong> ${escapeHtml(payload.phone || "Not provided")}<br><strong>Company:</strong> ${escapeHtml(payload.company || "Not provided")}</p><p><strong>Address:</strong> ${escapeHtml(address || "Not provided")}<br><strong>Departments:</strong> ${escapeHtml(departmentText)}<br><strong>Needed:</strong> ${escapeHtml(payload.timeframe || "Not provided")}</p><h2 style="font-size:17px">Request details</h2><p style="white-space:pre-wrap">${escapeHtml(payload.details || "See request in the manager portal")}</p></div>`,
          attachment,
        })
    const client = rawPayload.sendClient === false
      ? { status: "skipped" as const }
      : await sendEmail({
          to: payload.email,
          subject: `We received your quote request: ${payload.referenceId}`,
          replyTo: "avitanneto@gmail.com",
          text: `Hi ${payload.firstName},\n\nWe received your Avantia Build quote request. Someone from our team will contact you within the next 24 hours.\n\nReference: ${payload.referenceId}\n\nAvantia Build`,
          html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:auto"><p>Hi ${escapeHtml(payload.firstName)},</p><h1 style="font-size:22px">We received your quote request</h1><p>Someone from Avantia Build will contact you within the next 24 hours.</p><p><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}</p><p style="margin-top:24px"><strong>Avantia Build</strong></p></div>`,
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
      subject: `New quote request: ${payload.projectName || fullName}`,
      replyTo: email,
      text: ownerText,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:680px;margin:auto"><p style="color:#0066cc;font-size:12px;font-weight:700">AVANTIA BUILD QUOTE REQUEST</p><h1 style="font-size:24px">${escapeHtml(payload.projectName || "New construction request")}</h1><p><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}<br><strong>Customer:</strong> ${escapeHtml(fullName)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Phone:</strong> ${escapeHtml(payload.phone || "Not provided")}<br><strong>Company:</strong> ${escapeHtml(payload.company || "Not provided")}</p><p><strong>Address:</strong> ${escapeHtml(address || "Not provided")}<br><strong>Departments:</strong> ${escapeHtml(departmentText)}<br><strong>Needed:</strong> ${escapeHtml(payload.timeframe || "Not provided")}</p><h2 style="font-size:17px">Request details</h2><p style="white-space:pre-wrap">${escapeHtml(payload.details || "See attached file")}</p></div>`,
      attachment: payload.attachment,
    })
    const clientText = `Hi ${payload.firstName},\n\nWe received your Avantia Build quote request. Someone from our team will contact you within the next 24 hours.\n\nReference: ${payload.referenceId}\nProject: ${payload.projectName || "Not named"}\n\nAvantia Build\nEverything it takes to build`
    const clientEmail = await sendEmail({
      to: email,
      subject: `We received your quote request: ${payload.referenceId}`,
      replyTo: "avitanneto@gmail.com",
      text: clientText,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:auto"><p>Hi ${escapeHtml(payload.firstName)},</p><h1 style="font-size:22px">We received your quote request</h1><p>Someone from Avantia Build will contact you within the next 24 hours.</p><p><strong>Reference:</strong> ${escapeHtml(payload.referenceId)}<br><strong>Project:</strong> ${escapeHtml(payload.projectName || "Not named")}</p><p style="margin-top:24px"><strong>Avantia Build</strong><br><span style="color:#64748b">Everything it takes to build</span></p></div>`,
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

    return json({ ok: true, clientId, projectId, requestId, referenceId: payload.referenceId, email: { owner: ownerEmail, client: clientEmail } })
  } catch (cause) {
    if (storedFilePath) await supabase.storage.from("project-uploads").remove([storedFilePath])
    if (projectId) await supabase.from("projects").delete().eq("id", projectId)
    if (createdClient && clientId) await supabase.auth.admin.deleteUser(clientId)
    console.error("public_quote_intake_failed", cause instanceof Error ? cause.message : "unknown")
    return json({ error: "save_failed" }, 500)
  }
})

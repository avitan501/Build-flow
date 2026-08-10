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
  attachment?: { filename: string; content: string; type: string }
}

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

async function sendEmail(input: { to: string; subject: string; html: string; text: string; replyTo?: string; attachment?: QuotePayload["attachment"] }) {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) return "not_configured"
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: "Avantia Build <onboarding@resend.dev>",
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
      attachments: input.attachment ? [{ filename: input.attachment.filename, content: input.attachment.content }] : undefined,
    }),
  })
  return response.ok ? "sent" : "failed"
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

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)
  if (!hasValidPublicKey(request)) return json({ error: "unauthorized" }, 401)

  let payload: QuotePayload
  try {
    payload = await request.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }
  if (!valid(payload)) return json({ error: "invalid_request" }, 400)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "service_unavailable" }, 503)

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
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

    if (payload.attachment) {
      if (!allowedTypes.has(payload.attachment.type)) throw new Error("invalid_attachment")
      const bytes = decodeBase64(payload.attachment.content)
      if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("attachment_too_large")
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

    return json({ ok: true, clientId, projectId, requestId, referenceId: payload.referenceId, email: { owner: ownerEmail, client: clientEmail } })
  } catch (cause) {
    if (storedFilePath) await supabase.storage.from("project-uploads").remove([storedFilePath])
    if (projectId) await supabase.from("projects").delete().eq("id", projectId)
    if (createdClient && clientId) await supabase.auth.admin.deleteUser(clientId)
    console.error("public_quote_intake_failed", cause instanceof Error ? cause.message : "unknown")
    return json({ error: "save_failed" }, 500)
  }
})

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

function valid(payload: QuotePayload) {
  return payload.referenceId?.startsWith("AB-")
    && payload.firstName?.length > 0
    && payload.lastName?.length > 0
    && /^\S+@\S+\.\S+$/.test(payload.email || "")
    && (payload.phone || "").replace(/\D/g, "").length >= 7
    && payload.street?.length > 0
    && payload.city?.length > 0
    && payload.state?.length > 0
    && /^\d{5}(?:-\d{4})?$/.test(payload.zip || "")
    && Array.isArray(payload.departments)
    && payload.departments.length > 0
    && payload.details?.length >= 10
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)

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
  const address = `${payload.street.trim()}, ${payload.city.trim()}, ${payload.state.trim()} ${payload.zip.trim()}`
  let clientId = ""
  let projectId = ""
  let requestId = ""
  let storedFilePath = ""
  let createdClient = false

  try {
    const { data: profile } = await supabase.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle<{ id: string }>()
    if (profile) {
      clientId = profile.id
      const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: payload.phone, company_name: payload.company || null }).eq("id", clientId)
      if (error) throw new Error("profile_update_failed")
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: `${crypto.randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone: payload.phone, company_name: payload.company || null },
      })
      if (error || !data.user) throw new Error("client_create_failed")
      clientId = data.user.id
      createdClient = true
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: clientId,
        email,
        full_name: fullName,
        phone: payload.phone,
        company_name: payload.company || null,
        role: "client",
        approval_status: "pending",
        is_active: true,
      }, { onConflict: "id" })
      if (profileError) throw new Error("profile_create_failed")
    }

    const { data: project, error: projectError } = await supabase.from("projects").insert({
      owner_id: clientId,
      name: payload.projectName?.trim() || `${payload.street.trim()} quote request`,
      address,
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
      { questionId: "customer_type", label: "Customer type", value: payload.customerType },
      { questionId: "project_type", label: "Project type", value: payload.projectType },
      { questionId: "timeframe", label: "Materials needed", value: payload.timeframe },
      { questionId: "departments", label: "Departments", value: payload.departments.join(", ") },
      { questionId: "request_details", label: "Request details", value: payload.details },
    ]
    const { error: itemError } = await supabase.from("quote_request_items").insert({
      request_id: requestId,
      project_id: projectId,
      owner_id: clientId,
      name: "Construction quote request",
      department: payload.departments.join(", "),
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

    return json({ ok: true, clientId, projectId, requestId, referenceId: payload.referenceId })
  } catch (cause) {
    if (storedFilePath) await supabase.storage.from("project-uploads").remove([storedFilePath])
    if (projectId) await supabase.from("projects").delete().eq("id", projectId)
    if (createdClient && clientId) await supabase.auth.admin.deleteUser(clientId)
    console.error("public_quote_intake_failed", cause instanceof Error ? cause.message : "unknown")
    return json({ error: "save_failed" }, 500)
  }
})

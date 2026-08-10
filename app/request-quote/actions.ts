"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { sendQuoteIntakeEmail } from "@/lib/cart-submission-email"
import { createAdminClient } from "@/lib/supabase/admin"

export type QuoteRequestFormState = {
  status: "idle" | "success" | "error"
  message: string
  referenceId?: string
  requestId?: string
}

const ALLOWED_FILES = new Map([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
])
const MAX_FILE_SIZE = 4 * 1024 * 1024

function field(formData: FormData, name: string, maxLength = 500) {
  return String(formData.get(name) || "").trim().slice(0, maxLength)
}

function error(message: string): QuoteRequestFormState {
  return { status: "error", message }
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._ -]+/g, "-").slice(0, 100) || "project-file"
}

type QuoteIntakePayload = {
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

async function saveWithSupabaseFunction(payload: QuoteIntakePayload) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const response = await fetch(`${url}/functions/v1/public-quote-intake`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
  if (!response.ok) return null
  return response.json() as Promise<{ ok: true; requestId: string }>
}

async function findClientByEmail(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await supabase.from("profiles").select("id,email").ilike("email", email).limit(1).maybeSingle<{ id: string; email: string }>()
  return data
}

export async function submitQuoteRequestFormAction(_previousState: QuoteRequestFormState, formData: FormData): Promise<QuoteRequestFormState> {
  if (field(formData, "website")) return { status: "success", message: "Your request was received." }

  const firstName = field(formData, "firstName", 80)
  const lastName = field(formData, "lastName", 80)
  const email = field(formData, "email", 160).toLowerCase()
  const phone = field(formData, "phone", 40)
  const company = field(formData, "company", 120)
  const customerType = field(formData, "customerType", 80)
  const projectName = field(formData, "projectName", 140)
  const projectType = field(formData, "projectType", 80)
  const street = field(formData, "street", 180)
  const city = field(formData, "city", 100)
  const state = field(formData, "state", 40)
  const zip = field(formData, "zip", 10)
  const timeframe = field(formData, "timeframe", 80)
  const details = field(formData, "details", 5000)
  const departments = formData.getAll("departments").map((value) => String(value).trim()).filter(Boolean).slice(0, 12)

  if (!firstName || !lastName) return error("Enter your first and last name.")
  if (!/^\S+@\S+\.\S+$/.test(email)) return error("Enter a valid email address.")
  if (phone.replace(/\D/g, "").length < 7) return error("Enter a valid phone number.")
  if (!customerType) return error("Choose the option that best describes you.")
  if (!projectType) return error("Choose a project type.")
  if (!street || !city || !state || !/^\d{5}(?:-\d{4})?$/.test(zip)) return error("Complete the job-site address, including a valid ZIP code.")
  if (!timeframe) return error("Choose when the materials are needed.")
  if (departments.length === 0) return error("Choose at least one material department.")
  if (details.length < 10) return error("Tell us what you need, including any known sizes or quantities.")

  const uploaded = formData.get("attachment")
  let attachment: { filename: string; content: string; bytes: Uint8Array<ArrayBuffer>; type: string } | undefined
  if (uploaded instanceof File && uploaded.size > 0) {
    if (uploaded.size > MAX_FILE_SIZE) return error("The attachment must be 4 MB or smaller.")
    const filename = safeFileName(uploaded.name)
    const extension = filename.split(".").pop()?.toLowerCase() || ""
    const expectedType = ALLOWED_FILES.get(extension)
    if (!expectedType) return error("Attach a PDF, JPG, PNG, or WebP file.")
    const bytes = new Uint8Array(await uploaded.arrayBuffer())
    attachment = { filename, content: Buffer.from(bytes).toString("base64"), bytes, type: expectedType }
  }

  const referenceId = `AB-${randomUUID().slice(0, 8).toUpperCase()}`
  const fullName = `${firstName} ${lastName}`
  const address = `${street}, ${city}, ${state} ${zip}`
  const intakePayload: QuoteIntakePayload = {
    referenceId,
    firstName,
    lastName,
    email,
    phone,
    company,
    customerType,
    projectName,
    projectType,
    street,
    city,
    state,
    zip,
    timeframe,
    departments,
    details,
    attachment: attachment ? { filename: attachment.filename, content: attachment.content, type: attachment.type } : undefined,
  }
  let projectId = ""
  let requestId = ""
  let clientId = ""
  let createdClient = false
  let storedFilePath = ""

  try {
    const supabase = createAdminClient()
    const existingClient = await findClientByEmail(supabase, email)

    if (existingClient) {
      clientId = existingClient.id
      const { error: profileError } = await supabase.from("profiles").update({
        full_name: fullName,
        phone,
        company_name: company || null,
      }).eq("id", clientId)
      if (profileError) throw new Error("profile_update_failed")
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, company_name: company || null },
      })
      if (authError || !authData.user) throw new Error("client_create_failed")
      clientId = authData.user.id
      createdClient = true
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: clientId,
        email,
        full_name: fullName,
        phone,
        company_name: company || null,
        role: "client",
        approval_status: "pending",
        is_active: true,
      }, { onConflict: "id" })
      if (profileError) throw new Error("profile_create_failed")
    }

    const { data: project, error: projectError } = await supabase.from("projects").insert({
      owner_id: clientId,
      name: projectName || `${street} quote request`,
      address,
      status: "active",
    }).select("id").single<{ id: string }>()
    if (projectError || !project) throw new Error("project_create_failed")
    projectId = project.id

    const { data: request, error: requestError } = await supabase.from("quote_requests").insert({
      project_id: projectId,
      owner_id: clientId,
      title: projectName ? `${projectName} quote request` : `Construction quote ${referenceId}`,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).select("id").single<{ id: string }>()
    if (requestError || !request) throw new Error("request_create_failed")
    requestId = request.id

    const answers = [
      { questionId: "customer_type", label: "Customer type", value: customerType },
      { questionId: "project_type", label: "Project type", value: projectType },
      { questionId: "timeframe", label: "Materials needed", value: timeframe },
      { questionId: "departments", label: "Departments", value: departments.join(", ") },
      { questionId: "request_details", label: "Request details", value: details },
    ]
    const { error: itemError } = await supabase.from("quote_request_items").insert({
      request_id: requestId,
      project_id: projectId,
      owner_id: clientId,
      name: "Construction quote request",
      department: departments.join(", "),
      item_type: "custom_priced",
      quantity: 1,
      unit: "request",
      unit_price: 0,
      qualification_status: "answered",
      answers,
      metadata: { reference_id: referenceId, source: "public_quote_form", request_details: details },
    })
    if (itemError) throw new Error("request_item_create_failed")

    if (attachment) {
      storedFilePath = `${clientId}/${projectId}/${randomUUID()}-${attachment.filename}`
      const { error: uploadError } = await supabase.storage.from("project-uploads").upload(storedFilePath, attachment.bytes, {
        contentType: attachment.type,
        upsert: false,
      })
      if (uploadError) throw new Error("attachment_upload_failed")
      const { error: attachmentError } = await supabase.from("quote_request_attachments").insert({
        request_id: requestId,
        project_id: projectId,
        owner_id: clientId,
        file_name: attachment.filename,
        file_path: storedFilePath,
        file_type: attachment.type,
        file_size: attachment.bytes.byteLength,
      })
      if (attachmentError) throw new Error("attachment_record_failed")
    }

    await sendQuoteIntakeEmail({
      ...intakePayload,
      attachment: attachment ? { filename: attachment.filename, content: attachment.content } : undefined,
    })

    revalidatePath("/admin/users")
    revalidatePath("/owner/materials/requests")
    return {
      status: "success",
      message: "Your request was received. Someone from Avantia Build will be with you shortly and will call you back within the next 24 hours.",
      referenceId,
      requestId,
    }
  } catch {
    try {
      const supabase = createAdminClient()
      if (storedFilePath) await supabase.storage.from("project-uploads").remove([storedFilePath])
      if (projectId) await supabase.from("projects").delete().eq("id", projectId)
      if (createdClient && clientId) await supabase.auth.admin.deleteUser(clientId)
    } catch {
      // Preserve the original submission error; cleanup is best effort.
    }
    try {
      const saved = await saveWithSupabaseFunction(intakePayload)
      if (saved?.ok) {
        await sendQuoteIntakeEmail({
          ...intakePayload,
          attachment: attachment ? { filename: attachment.filename, content: attachment.content } : undefined,
        })
        revalidatePath("/admin/users")
        revalidatePath("/owner/materials/requests")
        return {
          status: "success",
          message: "Your request was received. Someone from Avantia Build will be with you shortly and will call you back within the next 24 hours.",
          referenceId,
          requestId: saved.requestId,
        }
      }
    } catch {
      // Return the customer-facing save error below.
    }
    return error("We could not save your request. Please try again or call (929) 207-7156.")
  }
}

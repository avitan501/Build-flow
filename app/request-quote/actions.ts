"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { sendQuoteIntakeEmail } from "@/lib/cart-submission-email"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSupabasePublicEnv } from "@/lib/supabase/env"

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
const MAX_STORED_FILE_SIZE = 25 * 1024 * 1024
const TEMP_UPLOAD_PREFIX = "public-intake/"

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
  attachment?: { filename: string; content?: string; storagePath?: string; type: string; size?: number }
}

async function saveWithSupabaseFunction(payload: QuoteIntakePayload) {
  let url = ""
  let key = ""
  try {
    const config = getSupabasePublicEnv()
    url = config.url
    key = config.anonKey
  } catch {
    return null
  }
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

  const fullNameInput = field(formData, "fullName", 160) || `${field(formData, "firstName", 80)} ${field(formData, "lastName", 80)}`.trim()
  const nameParts = fullNameInput.split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] || ""
  const lastName = nameParts.slice(1).join(" ")
  const email = field(formData, "email", 160).toLowerCase()
  const phone = field(formData, "phone", 40)
  const company = field(formData, "company", 120)
  const customerType = field(formData, "customerType", 80)
  const projectName = field(formData, "projectName", 140)
  const projectType = field(formData, "projectType", 80)
  const addressInput = field(formData, "address", 300)
  const street = addressInput || field(formData, "street", 180)
  const city = field(formData, "city", 100)
  const state = field(formData, "state", 40)
  const zip = field(formData, "zip", 10)
  const timeframe = field(formData, "timeframe", 80)
  const details = field(formData, "details", 5000)
  const departments = formData.getAll("departments").map((value) => String(value).trim()).filter(Boolean).slice(0, 12)

  if (!firstName || !lastName) return error("Enter your full name, including first and last name.")
  if (!/^\S+@\S+\.\S+$/.test(email)) return error("Enter a valid email address.")
  if (phone && phone.replace(/\D/g, "").length < 7) return error("Enter a valid phone number or leave it blank.")

  const uploaded = formData.get("attachment")
  const attachmentPath = field(formData, "attachmentPath", 300)
  const attachmentName = field(formData, "attachmentName", 160)
  const attachmentType = field(formData, "attachmentType", 120)
  const attachmentSize = Number(field(formData, "attachmentSize", 20))
  let attachment: { filename: string; content?: string; bytes?: Uint8Array<ArrayBuffer>; storagePath?: string; type: string; size: number } | undefined
  if (uploaded instanceof File && uploaded.size > 0) {
    if (uploaded.size > MAX_FILE_SIZE) return error("The attachment must be 4 MB or smaller.")
    const filename = safeFileName(uploaded.name)
    const extension = filename.split(".").pop()?.toLowerCase() || ""
    const expectedType = ALLOWED_FILES.get(extension)
    if (!expectedType) return error("Attach a PDF, JPG, PNG, or WebP file.")
    const bytes = new Uint8Array(await uploaded.arrayBuffer())
    attachment = { filename, content: Buffer.from(bytes).toString("base64"), bytes, type: expectedType, size: bytes.byteLength }
  } else if (attachmentPath || attachmentName || attachmentType || attachmentSize) {
    if (!attachmentPath.startsWith(TEMP_UPLOAD_PREFIX) || attachmentPath.includes("..")) return error("The uploaded attachment could not be verified. Please select it again.")
    const filename = safeFileName(attachmentName)
    const extension = filename.split(".").pop()?.toLowerCase() || ""
    const expectedType = ALLOWED_FILES.get(extension)
    if (!expectedType || expectedType !== attachmentType) return error("Attach a PDF, JPG, PNG, or WebP file.")
    if (!Number.isFinite(attachmentSize) || attachmentSize <= 0 || attachmentSize > MAX_STORED_FILE_SIZE) return error("The attachment must be 25 MB or smaller.")
    attachment = { filename, storagePath: attachmentPath, type: expectedType, size: attachmentSize }
  }
  if (details.length < 3 && !attachment) return error("Tell us what you need or attach a plan or material list.")

  const referenceId = `AB-${randomUUID().slice(0, 8).toUpperCase()}`
  const fullName = `${firstName} ${lastName}`
  const address = addressInput || [street, city, state, zip].filter(Boolean).join(", ")
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
    attachment: attachment ? { filename: attachment.filename, content: attachment.content, storagePath: attachment.storagePath, type: attachment.type, size: attachment.size } : undefined,
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
      name: projectName || `Quote request ${referenceId}`,
      address: address || null,
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
      ...(customerType ? [{ questionId: "customer_type", label: "Customer type", value: customerType }] : []),
      ...(projectType ? [{ questionId: "project_type", label: "Project type", value: projectType }] : []),
      ...(timeframe ? [{ questionId: "timeframe", label: "Materials needed", value: timeframe }] : []),
      ...(departments.length ? [{ questionId: "departments", label: "Departments", value: departments.join(", ") }] : []),
      { questionId: "request_details", label: "Request details", value: details },
    ]
    const { error: itemError } = await supabase.from("quote_request_items").insert({
      request_id: requestId,
      project_id: projectId,
      owner_id: clientId,
      name: "Construction quote request",
      department: departments.join(", ") || "General request",
      item_type: "custom_priced",
      quantity: 1,
      unit: "request",
      unit_price: 0,
      qualification_status: "answered",
      answers,
      metadata: { reference_id: referenceId, source: "public_quote_form", request_details: details },
    })
    if (itemError) throw new Error("request_item_create_failed")

    if (attachment?.storagePath) {
      const { data: fileInfo, error: infoError } = await supabase.storage.from("project-uploads").info(attachment.storagePath)
      if (infoError || !fileInfo || fileInfo.size !== attachment.size || fileInfo.size > MAX_STORED_FILE_SIZE || fileInfo.contentType !== attachment.type) throw new Error("attachment_verification_failed")
      const { data: emailFile, error: downloadError } = await supabase.storage.from("project-uploads").download(attachment.storagePath)
      if (downloadError || !emailFile) throw new Error("attachment_download_failed")
      attachment.content = Buffer.from(await emailFile.arrayBuffer()).toString("base64")
      storedFilePath = `${clientId}/${projectId}/${randomUUID()}-${attachment.filename}`
      const { error: moveError } = await supabase.storage.from("project-uploads").move(attachment.storagePath, storedFilePath)
      if (moveError) throw new Error("attachment_move_failed")
      const { error: attachmentError } = await supabase.from("quote_request_attachments").insert({
        request_id: requestId,
        project_id: projectId,
        owner_id: clientId,
        file_name: attachment.filename,
        file_path: storedFilePath,
        file_type: attachment.type,
        file_size: attachment.size,
      })
      if (attachmentError) throw new Error("attachment_record_failed")
    } else if (attachment?.bytes) {
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

    const emailDelivery = await sendQuoteIntakeEmail({
      ...intakePayload,
      requestId,
      attachment: attachment ? { filename: attachment.filename, content: attachment.content } : undefined,
    })
    await supabase.from("quote_request_items").update({
      metadata: {
        reference_id: referenceId,
        source: "public_quote_form",
        request_details: details,
        email_delivery: {
          owner: emailDelivery.owner.status,
          client: emailDelivery.client.status,
          checked_at: new Date().toISOString(),
        },
      },
    }).eq("request_id", requestId)

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

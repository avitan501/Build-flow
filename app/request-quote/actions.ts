"use server"

import { randomUUID } from "node:crypto"

import { sendQuoteIntakeEmail } from "@/lib/cart-submission-email"

export type QuoteRequestFormState = {
  status: "idle" | "success" | "error"
  message: string
  referenceId?: string
}

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "dwg", "dxf", "jpg", "jpeg", "png", "webp", "zip"])
const MAX_FILE_SIZE = 10 * 1024 * 1024

function field(formData: FormData, name: string, maxLength = 500) {
  return String(formData.get(name) || "").trim().slice(0, maxLength)
}

function error(message: string): QuoteRequestFormState {
  return { status: "error", message }
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
  let attachment: { filename: string; content: string } | undefined
  if (uploaded instanceof File && uploaded.size > 0) {
    if (uploaded.size > MAX_FILE_SIZE) return error("The attachment must be 10 MB or smaller.")
    const filename = uploaded.name.replace(/[^a-zA-Z0-9._ -]+/g, "-").slice(0, 100) || "project-file"
    const extension = filename.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_EXTENSIONS.has(extension)) return error("Use a PDF, Word, Excel, CSV, CAD, image, or ZIP file.")
    attachment = { filename, content: Buffer.from(await uploaded.arrayBuffer()).toString("base64") }
  }

  const referenceId = `AB-${randomUUID().slice(0, 8).toUpperCase()}`
  const delivery = await sendQuoteIntakeEmail({
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
    attachment,
  })

  if (delivery.owner.status === "not_configured") return error("Online quote delivery is temporarily unavailable. Please call (929) 207-7156.")
  if (delivery.owner.status !== "sent") return error("We could not send the request. Please try again or call (929) 207-7156.")

  return {
    status: "success",
    message: "Your quote request was sent to Avantia Build. We will review it and contact you if we need more information.",
    referenceId,
  }
}

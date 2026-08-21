"use server"

import { requireStaffProfile } from "@/lib/auth"

export type EstimateConverterState = {
  status: "idle" | "success" | "error"
  message: string
  output: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_TEXT_LENGTH = 120_000

function field(formData: FormData, name: string, maxLength = 500) {
  return String(formData.get(name) || "").trim().slice(0, maxLength)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function extractFileText(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error("The estimate must be 10 MB or smaller.")
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    await import("@napi-rs/canvas")
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: bytes })
    const result = await parser.getText()
    await parser.destroy()
    return String(result.text || "")
  }
  if (file.type.startsWith("text/") || /\.(txt|csv)$/i.test(file.name)) {
    return new TextDecoder().decode(bytes)
  }
  throw new Error("Upload a searchable PDF, TXT, or CSV estimate.")
}

function convertEstimate(input: {
  source: string
  originalCompany: string
  originalClient: string
  projectLabel: string
  hidePrices: boolean
}) {
  let body = input.source.replace(/\r/g, "").replace(/\u0000/g, "").slice(0, MAX_TEXT_LENGTH)
  for (const value of [input.originalCompany, input.originalClient].filter(Boolean)) {
    body = body.replace(new RegExp(escapeRegExp(value), "gi"), "[removed]")
  }

  const identityLine = /^(prepared\s+(?:by|for)|bill\s+to|ship\s+to|client|customer|customer\s+name|company|contractor|vendor|contact|phone|email)\s*[:#-]/i
  const priceLine = /^(subtotal|total|tax|markup|deposit|balance|amount\s+due)\s*[:$]/i
  const cleanedLines = body
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && !identityLine.test(line))
    .filter((line) => !(input.hidePrices && priceLine.test(line)))
    .map((line) => input.hidePrices ? line.replace(/\$\s?\d[\d,]*(?:\.\d{1,2})?/g, "[price removed]") : line)

  const details = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return [
    "AVANTIA BUILD",
    "PROPOSAL REQUEST",
    input.projectLabel ? `Project: ${input.projectLabel}` : "Project: To be confirmed",
    "Requested by: Avantia Build",
    "",
    "Please provide your best pricing and availability for the following scope and materials:",
    "",
    details,
    "",
    "Please include lead times, delivery charges, taxes, substitutions, and exclusions in your proposal.",
    "Avantia Build | (516) 908-8319",
  ].filter((line, index, lines) => line || lines[index - 1] !== "").join("\n")
}

export async function convertEstimateAction(_previous: EstimateConverterState, formData: FormData): Promise<EstimateConverterState> {
  await requireStaffProfile("aiTools")
  try {
    const pasted = field(formData, "sourceText", MAX_TEXT_LENGTH)
    const uploaded = formData.get("sourceFile")
    const fileText = uploaded instanceof File && uploaded.size > 0 ? await extractFileText(uploaded) : ""
    const source = pasted || fileText
    if (source.length < 10) return { status: "error", message: "Paste estimate text or upload a searchable estimate.", output: "" }
    const output = convertEstimate({
      source,
      originalCompany: field(formData, "originalCompany", 160),
      originalClient: field(formData, "originalClient", 160),
      projectLabel: field(formData, "projectLabel", 180),
      hidePrices: formData.get("hidePrices") === "on",
    })
    return { status: "success", message: "Proposal request prepared. Review it before sending.", output }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "The estimate could not be converted.", output: "" }
  }
}

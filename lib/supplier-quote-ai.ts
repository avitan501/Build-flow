import { Buffer } from "node:buffer"

import type { ExtractedSupplierQuoteItem } from "@/lib/supplier-quote-parser"

export type SupplierQuoteAiMetadata = {
  supplierName: string
  quoteNumber: string
  quoteDate: string
  expiresOn: string
  department: string
  deliveryCharge: number
  taxPercent: number
  subtotal: number | null
  total: number | null
}

export type SupplierQuoteAiResult = {
  metadata: SupplierQuoteAiMetadata
  items: ExtractedSupplierQuoteItem[]
  notes: string
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}

const AI_TIMEOUT_MS = 60_000
const MAX_AI_ITEMS = 500
const NON_MATERIAL_LINE_PATTERN = /^(?:delivery|shipping|freight)(?: charge| fee)?$|^(?:sales tax|tax|subtotal|grand total|total|discount)$/i

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""
}

function nonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10_000) / 10_000 : null
}

function positiveNumber(value: unknown, fallback = 1) {
  const parsed = nonNegativeNumber(value)
  return parsed !== null && parsed > 0 ? parsed : fallback
}

function isoDate(value: unknown) {
  const text = cleanText(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ""
}

function responseText(response: OpenAIResponse) {
  if (response.output_text?.trim()) return response.output_text.trim()
  return (response.output ?? []).flatMap((entry) => entry.content ?? []).map((entry) => entry.text ?? "").join("\n").trim()
}

export function normalizeSupplierQuoteAiPayload(value: unknown): SupplierQuoteAiResult {
  const payload = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const metadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
    ? payload.metadata as Record<string, unknown>
    : {}
  const items = Array.isArray(payload.items) ? payload.items : []

  return {
    metadata: {
      supplierName: cleanText(metadata.supplierName, 200),
      quoteNumber: cleanText(metadata.quoteNumber, 100),
      quoteDate: isoDate(metadata.quoteDate),
      expiresOn: isoDate(metadata.expiresOn),
      department: cleanText(metadata.department, 120),
      deliveryCharge: nonNegativeNumber(metadata.deliveryCharge) ?? 0,
      taxPercent: Math.min(100, nonNegativeNumber(metadata.taxPercent) ?? 0),
      subtotal: nonNegativeNumber(metadata.subtotal),
      total: nonNegativeNumber(metadata.total),
    },
    items: items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => {
        const quantity = positiveNumber(item.quantity)
        const unitPrice = nonNegativeNumber(item.unitPrice)
        const statedTotal = nonNegativeNumber(item.lineTotal)
        return {
          itemCode: cleanText(item.itemCode, 120),
          description: cleanText(item.description, 500),
          specification: cleanText(item.specification, 1000),
          quantity,
          unit: cleanText(item.unit, 40) || "each",
          unitPrice,
          lineTotal: statedTotal ?? (unitPrice === null ? null : Math.round(quantity * unitPrice * 100) / 100),
        }
      })
      .filter((item) => item.description && !NON_MATERIAL_LINE_PATTERN.test(item.description))
      .slice(0, MAX_AI_ITEMS),
    notes: cleanText(payload.notes, 1000),
  }
}

const quoteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["metadata", "items", "notes"],
  properties: {
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["supplierName", "quoteNumber", "quoteDate", "expiresOn", "department", "deliveryCharge", "taxPercent", "subtotal", "total"],
      properties: {
        supplierName: { type: "string" },
        quoteNumber: { type: "string" },
        quoteDate: { type: "string", description: "YYYY-MM-DD or empty string" },
        expiresOn: { type: "string", description: "YYYY-MM-DD or empty string" },
        department: { type: "string" },
        deliveryCharge: { type: "number", minimum: 0 },
        taxPercent: { type: "number", minimum: 0, maximum: 100 },
        subtotal: { type: ["number", "null"], minimum: 0 },
        total: { type: ["number", "null"], minimum: 0 },
      },
    },
    items: {
      type: "array",
      maxItems: MAX_AI_ITEMS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["itemCode", "description", "specification", "quantity", "unit", "unitPrice", "lineTotal"],
        properties: {
          itemCode: { type: "string" },
          description: { type: "string" },
          specification: { type: "string" },
          quantity: { type: "number", exclusiveMinimum: 0 },
          unit: { type: "string" },
          unitPrice: { type: ["number", "null"], minimum: 0 },
          lineTotal: { type: ["number", "null"], minimum: 0 },
        },
      },
    },
    notes: { type: "string" },
  },
} as const

const EXTRACTION_PROMPT = `Read this supplier quote, estimate, invoice, receipt, or material price list. Use OCR when the document is scanned or photographed. Extract only actual purchasable material rows. Do not turn headings, addresses, subtotals, tax, delivery, discounts, payments, or grand totals into material items.

Preserve model numbers, SKUs, dimensions, thicknesses, colors, grades, pack sizes, and other product details. Put a concise product name in description and remaining details in specification. Use the quantity and unit shown. Never invent unreadable values. Use an empty string or null where the schema allows it. Dates must be YYYY-MM-DD. Calculate taxPercent only when the printed tax amount and taxable subtotal make it dependable. Use 0 when tax or delivery is absent or unclear. Every extracted value must be reviewed by a person before use.`

export async function extractSupplierQuoteWithAi(file: File, extractedText = ""): Promise<SupplierQuoteAiResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: EXTRACTION_PROMPT }]
  // Searchable documents use their extracted text to avoid the higher image/PDF token cost.
  if (extractedText.trim()) {
    content.push({ type: "input_text", text: `Source file: ${file.name}\n\n${extractedText.slice(0, 180_000)}` })
  } else {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`
    content.push(file.type.startsWith("image/")
      ? { type: "input_image", image_url: dataUrl, detail: "high" }
      : { type: "input_file", filename: file.name, file_data: dataUrl })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_SUPPLIER_QUOTE_MODEL || "gpt-5-mini",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 12_000,
      input: [{ role: "user", content }],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "supplier_quote_extraction",
          strict: true,
          schema: quoteSchema,
        },
      },
    }),
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    console.error("OpenAI supplier quote extraction unavailable", { status: response.status, requestId: response.headers.get("x-request-id") })
    return null
  }

  const text = responseText(await response.json() as OpenAIResponse)
  if (!text) return null
  try {
    return normalizeSupplierQuoteAiPayload(JSON.parse(text))
  } catch (error) {
    console.error("OpenAI supplier quote extraction returned invalid structured output", error)
    return null
  }
}

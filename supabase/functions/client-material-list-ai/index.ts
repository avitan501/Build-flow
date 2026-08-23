import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "npm:@supabase/supabase-js@2.57.4"
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js"

import { detectExplicitQuantityUnit, removeResolvedQuantityUnitReasons } from "./material-list-normalization.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false })
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
const MAX_FILE_BYTES = 25 * 1024 * 1024

type SourceItem = {
  id: string
  request_id: string
  project_id: string
  owner_id: string
  name: string
  department: string
  answers: unknown
  metadata: Record<string, unknown> | null
}

type Attachment = {
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
}

type AiItem = {
  name: string
  department: string
  quantity: number | null
  unit: string
  dimensions: string
  thickness: string
  details: string
  needsReview: boolean
  reviewStatus: "ready" | "check" | "missing"
  reviewReasons: string[]
  sourceText: string
}

type AiResult = {
  documentType: "material_list" | "plan" | "other"
  summary: string
  items: AiItem[]
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["documentType", "summary", "items"],
  properties: {
    documentType: { type: "string", enum: ["material_list", "plan", "other"] },
    summary: { type: "string" },
    items: {
      type: "array",
      maxItems: 300,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "department", "quantity", "unit", "dimensions", "thickness", "details", "needsReview", "reviewStatus", "reviewReasons", "sourceText"],
        properties: {
          name: { type: "string" },
          department: { type: "string" },
          quantity: { type: ["number", "null"], exclusiveMinimum: 0 },
          unit: { type: "string" },
          dimensions: { type: "string" },
          thickness: { type: "string" },
          details: { type: "string" },
          needsReview: { type: "boolean" },
          reviewStatus: { type: "string", enum: ["ready", "check", "missing"] },
          reviewReasons: { type: "array", maxItems: 5, items: { type: "string" } },
          sourceText: { type: "string" },
        },
      },
    },
  },
} as const

const prompt = `Organize a customer's construction shopping or material list into clean rows. The input may be typed notes, a PDF, a photo, or a scan and may be in English, Hebrew, or Spanish.

For each actual requested material, return one row with a concise construction item name, quantity, sales unit, dimensions, thickness, department, and remaining details. Keep model numbers, brands, colors, grades, lengths, widths, heights, pack sizes, and other specifications. Separate quantity from dimensions. Never use a price as a quantity. Do not include headings, addresses, totals, delivery, tax, labor, or explanatory text as material rows.

Do not invent missing information. Copy the shortest exact text fragment supporting each row into sourceText. Combine obvious wrapped lines that describe the same item, but do not combine different products. Use common concise English construction names while preserving printed brands, models, and specifications.

Never ask for or mark a quantity or sales unit missing when it is already printed in the supporting source text. Recognize quantity-first, item-first, abbreviated, bulleted, and table formats. These all mean the same thing: "14 squares siding", "Siding: 14 squares", "14 sq siding", "| 14 | squares | siding |", and "| siding | 14 | squares |". Likewise, recognize singular and plural construction units such as box/boxes, roll/rolls, sheet/sheets, pail/pails, and case/cases.

Treat department labels such as "Siding list", "Framing materials", "Electrical takeoff", or a standalone department heading as headings, never as material rows.

For siding, a panel-area quantity such as "40 squares siding" is not a complete siding order. Unless the source explicitly requests panels only, mark the row missing when any required ordering detail is absent: material/manufacturer, profile, color, waste allowance, starter-strip linear feet, outside-corner count/height/post size, inside-corner count/height/post size, J-channel/opening-trim linear feet/profile, or the inclusion/exclusion of house wrap, soffit, fascia, insulation, and fasteners. Never calculate perimeter, corners, or opening trim from siding squares alone.

Assign reviewStatus precisely:
- ready: the product identity, quantity, sales unit, and every ordering specification explicitly present in the source are clear. Do not require a dimension or thickness when that field does not apply to the product.
- check: the requested product is identifiable and orderable, but one printed detail is ambiguous or should be confirmed. State the specific issue in reviewReasons.
- missing: an essential value such as product identity, quantity, sales unit, model, required size, or required thickness is absent. Leave it empty and state exactly what is missing in reviewReasons.

Set needsReview false only for ready. Set it true for check or missing. Never add a generic review reason. Review reasons must name the missing or ambiguous field, for example "Confirm whether unit means box or piece" or "Drywall thickness is missing".

If the document is a blueprint, floor plan, architectural plan, or other document that requires a takeoff rather than an explicit shopping list, set documentType to plan and return no items. If it is not a usable material list, set documentType to other and return no items. Only check and missing rows require employee review before supplier pricing.`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" },
  })
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

function encodeBase64(bytes: Uint8Array) {
  let binary = ""
  for (let index = 0; index < bytes.length; index += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32_768))
  }
  return btoa(binary)
}

function responseText(response: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (response.output_text?.trim()) return response.output_text.trim()
  return (response.output ?? []).flatMap((entry) => entry.content ?? []).map((entry) => entry.text ?? "").join("\n").trim()
}

async function openAiKey() {
  const rows = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret from vault.decrypted_secrets where name = 'openai_supplier_quote_api_key' limit 1
  `
  return rows[0]?.decrypted_secret || null
}

async function authorized(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  if (!token) return false
  if (token === serviceKey) return true
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return false
  const { data: profile } = await admin.from("profiles").select("role,approval_status,is_active").eq("id", data.user.id).maybeSingle()
  return ["admin", "staff"].includes(profile?.role || "") && profile?.approval_status === "approved" && profile?.is_active === true
}

async function updateSource(source: SourceItem, state: Record<string, unknown>) {
  await admin.from("quote_request_items").update({ metadata: { ...(source.metadata ?? {}), ...state } }).eq("id", source.id)
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!await authorized(request)) return json({ error: "Staff authorization required" }, 401)

  const apiKey = await openAiKey()
  if (!apiKey) return json({ error: "AI is not configured" }, 503)

  let body: { requestId?: unknown; force?: unknown }
  try { body = await request.json() } catch { return json({ error: "Invalid JSON" }, 400) }
  const requestId = clean(body.requestId, 80)
  const force = body.force === true
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "Invalid request" }, 400)

  const [{ data: requestRecord }, { data: sourceItems }, { data: attachments }] = await Promise.all([
    admin.from("quote_requests").select("id").eq("id", requestId).maybeSingle(),
    admin.from("quote_request_items").select("id,request_id,project_id,owner_id,name,department,answers,metadata").eq("request_id", requestId).order("created_at").returns<SourceItem[]>(),
    admin.from("quote_request_attachments").select("file_name,file_path,file_type,file_size").eq("request_id", requestId).order("created_at").returns<Attachment[]>(),
  ])
  if (!requestRecord || !sourceItems?.length) return json({ error: "Request not found" }, 404)

  const source = sourceItems.find((item) => item.metadata?.ai_organized !== true) ?? sourceItems[0]
  const existing = sourceItems.filter((item) => item.metadata?.ai_organized === true)
  if (existing.length && !force) {
    await updateSource(source, { ai_organization_status: "organized", ai_organization_item_count: existing.length })
    return json({ ok: true, status: "already_organized", itemCount: existing.length })
  }
  const startedAt = Date.parse(clean(source.metadata?.ai_organization_started_at, 80))
  if (source.metadata?.ai_organization_status === "processing" && Number.isFinite(startedAt) && Date.now() - startedAt < 10 * 60 * 1000) {
    return json({ ok: true, status: "processing", itemCount: 0 })
  }
  await updateSource(source, { ai_organization_status: "processing", ai_organization_started_at: new Date().toISOString() })

  try {
    const requestDetails = clean(source.metadata?.request_details, 20_000)
    const sourceName = clean(source.name, 4_000)
    const typedSource = [requestDetails, sourceName && sourceName !== "Free-text material list" ? sourceName : ""]
      .filter(Boolean)
      .join("\n\n")
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }]
    if (typedSource) content.push({ type: "input_text", text: `Customer's typed material notes:\n\n${typedSource}` })

    const attachment = (attachments ?? []).find((file) => file.file_type === "application/pdf" || file.file_type?.startsWith("image/"))
    if (attachment && (attachment.file_size ?? 0) <= MAX_FILE_BYTES) {
      const { data: file, error } = await admin.storage.from("project-uploads").download(attachment.file_path)
      if (!error && file) {
        const mimeType = attachment.file_type || "application/octet-stream"
        const dataUrl = `data:${mimeType};base64,${encodeBase64(new Uint8Array(await file.arrayBuffer()))}`
        content.push(mimeType.startsWith("image/")
          ? { type: "input_image", image_url: dataUrl, detail: "high" }
          : { type: "input_file", filename: clean(attachment.file_name, 180), file_data: dataUrl })
      }
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 8_000,
        input: [{ role: "user", content }],
        text: { verbosity: "low", format: { type: "json_schema", name: "client_material_list", strict: true, schema } },
      }),
    })
    if (!response.ok) throw new Error(`openai_${response.status}`)
    const text = responseText(await response.json())
    const result = JSON.parse(text) as AiResult
    const items = result.documentType === "material_list" ? result.items.slice(0, 300) : []

    if (!items.length) {
      await updateSource(source, {
        ai_organization_status: result.documentType === "plan" ? "plan_requires_takeoff" : "needs_review",
        ai_organization_summary: clean(result.summary, 1000),
        ai_organization_completed_at: new Date().toISOString(),
      })
      return json({ ok: true, status: result.documentType, itemCount: 0 })
    }

    const organizedAt = new Date().toISOString()
    const rows = items.map((item) => {
      const sourceText = clean(item.sourceText, 1200)
      const detected = detectExplicitQuantityUnit(sourceText)
      const quantity = Number.isFinite(item.quantity) && Number(item.quantity) > 0 ? Number(item.quantity) : detected?.quantity
      const normalizedUnit = clean(item.unit, 60) || detected?.unit || ""
      const missingQuantity = !Number.isFinite(quantity) || Number(quantity) <= 0
      const missingUnit = !normalizedUnit
      const dimensions = clean(item.dimensions, 300)
      const thickness = clean(item.thickness, 160)
      const details = clean(item.details, 1200)
      const originalReviewReasons = item.reviewReasons.map((reason) => clean(reason, 240)).filter(Boolean).slice(0, 5)
      const reviewReasons = removeResolvedQuantityUnitReasons(originalReviewReasons, detected)
      const onlyResolvedQuantityUnit = Boolean(detected && originalReviewReasons.length && reviewReasons.length === 0)
      const aiReviewStatus = onlyResolvedQuantityUnit && item.reviewStatus === "missing" ? "ready" : item.reviewStatus
      const reviewStatus = missingQuantity || missingUnit ? "missing" : aiReviewStatus === "ready" && item.needsReview && !onlyResolvedQuantityUnit ? "check" : aiReviewStatus
      return {
        request_id: source.request_id,
        project_id: source.project_id,
        owner_id: source.owner_id,
        name: clean(item.name, 300) || "Material requiring review",
        department: clean(item.department, 120) || source.department || "Others",
        item_type: "material",
        quantity: missingQuantity ? 1 : Number(quantity),
        unit: normalizedUnit || (missingQuantity ? "quantity required" : "unspecified"),
        unit_price: 0,
        qualification_status: reviewStatus === "ready" ? "not_required" : "pending",
        answers: [],
        metadata: {
          ai_organized: true,
          ai_model: "gpt-5-mini",
          ai_organized_at: organizedAt,
          source_item_id: source.id,
          dimensions,
          thickness,
          request_details: [details, missingQuantity && "Quantity was not provided."].filter(Boolean).join(" · "),
          source_text: sourceText,
          review_status: reviewStatus,
          review_reasons: [
            ...reviewReasons,
            ...(missingQuantity && !reviewReasons.some((reason) => /quantity/i.test(reason)) ? ["Quantity is missing"] : []),
            ...(missingUnit && !reviewReasons.some((reason) => /unit/i.test(reason)) ? ["Sales unit is missing"] : []),
          ].slice(0, 5),
          needs_review: reviewStatus !== "ready",
        },
      }
    })
    const { data: insertedRows, error: insertError } = await admin.from("quote_request_items").insert(rows).select("id")
    if (insertError) throw new Error("organized_items_insert_failed")

    if (existing.length) {
      const { error: deleteError } = await admin.from("quote_request_items").delete().in("id", existing.map((item) => item.id))
      if (deleteError) {
        const insertedIds = (insertedRows ?? []).map((row) => row.id)
        if (insertedIds.length) await admin.from("quote_request_items").delete().in("id", insertedIds)
        throw new Error("previous_organized_items_replace_failed")
      }
    }

    await updateSource(source, {
      ai_organization_status: "organized",
      ai_organization_summary: clean(result.summary, 1000),
      ai_organization_item_count: rows.length,
      ai_organization_completed_at: organizedAt,
    })
    return json({ ok: true, status: "organized", itemCount: rows.length })
  } catch (cause) {
    const code = cause instanceof Error ? cause.message.slice(0, 120) : "unknown_error"
    await updateSource(source, { ai_organization_status: "failed", ai_organization_error: code, ai_organization_completed_at: new Date().toISOString() })
    return json({ error: "The material list could not be organized automatically." }, 502)
  }
})

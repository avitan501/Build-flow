// Codes only: never propagate arbitrary provider responses or customer text.
const failureCodes = new Set([
  "key_lookup_timeout",
  "organizer_failed", "organizer_timeout", "organizer_busy", "organizer_unavailable",
  "openai_timeout", "openai_unavailable", "openai_incomplete", "openai_refused",
  "openai_empty_output", "openai_invalid_json", "openai_invalid_shape",
  "organized_items_insert_failed", "previous_organized_items_replace_failed",
  "source_state_update_failed", "attachment_unavailable", "source_empty",
])

export function safeMaterialListFailure(value: unknown): string {
  return typeof value === "string" && (failureCodes.has(value) || /^(?:openai|organizer)_http_[45]\d{2}$/.test(value))
    ? value : "organizer_failed"
}

export class MaterialListFailure extends Error {
  constructor(code: string) { super(safeMaterialListFailure(code)); this.name = "MaterialListFailure" }
}

export function materialListFailureCode(cause: unknown): string {
  if (cause instanceof MaterialListFailure) return safeMaterialListFailure(cause.message)
  if (cause instanceof Error && cause.name === "AbortError") return "openai_timeout"
  return "organizer_failed"
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/** Reject incomplete/refused output before any organized rows can be written. */
export function completedMaterialListOutput(response: unknown): unknown {
  if (!object(response)) throw new MaterialListFailure("openai_invalid_shape")
  if (response.status !== "completed") throw new MaterialListFailure("openai_incomplete")
  const content = (Array.isArray(response.output) ? response.output : []).flatMap((entry) =>
    object(entry) && Array.isArray(entry.content) ? entry.content : [])
  if (content.some((entry) => object(entry) && entry.type === "refusal")) throw new MaterialListFailure("openai_refused")
  const text = typeof response.output_text === "string" && response.output_text.trim()
    ? response.output_text.trim()
    : content.filter(object).filter((entry) => entry.type === "output_text" && typeof entry.text === "string").map((entry) => entry.text).join("\n").trim()
  if (!text) throw new MaterialListFailure("openai_empty_output")
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new MaterialListFailure("openai_invalid_json") }
  if (!validMaterialListOutput(parsed)) throw new MaterialListFailure("openai_invalid_shape")
  return parsed
}

export function validMaterialListOutput(value: unknown): boolean {
  if (!object(value) || !["material_list", "plan", "other"].includes(String(value.documentType)) || typeof value.summary !== "string" || !Array.isArray(value.items) || value.items.length > 300) return false
  if (value.documentType === "material_list" && !value.items.length) return false
  return value.items.every((item) => object(item)
    && ["name", "department", "unit", "dimensions", "thickness", "details", "sourceText"].every((field) => typeof item[field] === "string")
    && typeof item.name === "string" && Boolean(item.name.trim())
    && (item.quantity === null || (typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0))
    && typeof item.needsReview === "boolean"
    && ["ready", "check", "missing"].includes(String(item.reviewStatus))
    && Array.isArray(item.reviewReasons) && item.reviewReasons.every((reason) => typeof reason === "string")
    && Array.isArray(item.attributes) && item.attributes.every((attribute) => object(attribute)
      && ["key", "label", "value", "sourceText"].every((field) => typeof attribute[field] === "string")))
}

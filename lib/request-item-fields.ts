export type RequestItemField = {
  id: string
  label: string
  value: string
}

export type CommonRequestItemField = {
  id: string
  label: string
  metadataKey: string
  suggestions: string[]
}

export const COMMON_REQUEST_ITEM_FIELDS: CommonRequestItemField[] = [
  { id: "color", label: "Color", metadataKey: "color", suggestions: ["White", "Black", "Gray", "Brown", "Beige", "Natural", "Custom match"] },
  { id: "brand", label: "Brand", metadataKey: "brand", suggestions: ["No preference", "Match existing", "Contractor choice", "Customer choice"] },
  { id: "dimensions", label: "Size / dimensions", metadataKey: "dimensions", suggestions: ["4 x 8 ft.", "4 x 10 ft.", "4 x 12 ft.", "Custom size"] },
  { id: "thickness", label: "Thickness", metadataKey: "thickness", suggestions: ["1/4 in.", "1/2 in.", "5/8 in.", "3/4 in."] },
  { id: "length", label: "Length", metadataKey: "screw_length", suggestions: ["1 in.", "1-1/4 in.", "1-5/8 in.", "2 in.", "2-1/2 in.", "3 in."] },
  { id: "type", label: "Type / material", metadataKey: "product_type", suggestions: ["Standard", "Premium", "Match existing", "No preference"] },
  { id: "finish", label: "Finish", metadataKey: "finish", suggestions: ["Matte", "Satin", "Semi-gloss", "Gloss", "Match existing"] },
  { id: "model", label: "Model / SKU", metadataKey: "model", suggestions: ["Exact match required", "Equivalent accepted"] },
  { id: "coverage", label: "Coverage / pack", metadataKey: "coverage", suggestions: ["Per box", "Per bundle", "Per roll", "Per pallet"] },
  { id: "packaging", label: "Packaging", metadataKey: "packaging", suggestions: ["Box", "Bundle", "Pallet", "Roll", "Loose pieces"] },
  { id: "grade", label: "Grade", metadataKey: "grade", suggestions: ["Standard", "Premium", "Contractor grade", "Match existing"] },
  { id: "shipping", label: "Shipping / delivery", metadataKey: "shipping", suggestions: ["Pickup", "Curbside delivery", "Jobsite delivery", "Delivery included", "Freight", "To be confirmed"] },
  { id: "delivery-address", label: "Delivery address", metadataKey: "delivery_address", suggestions: ["Use customer address", "Use jobsite address", "To be confirmed"] },
  { id: "price-requirements", label: "Price requirements", metadataKey: "price_requirements", suggestions: ["Tax included", "Shipping included", "Tax and shipping included", "Itemized tax and freight"] },
]

const COMMON_BY_ID = new Map(COMMON_REQUEST_ITEM_FIELDS.map((field) => [field.id, field]))
const COMMON_BY_METADATA_KEY = new Map(COMMON_REQUEST_ITEM_FIELDS.map((field) => [field.metadataKey, field]))

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

function safeFieldId(value: unknown, fallback: string) {
  const id = clean(value, 80).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
  return id || fallback
}

export function normalizeRequestItemFields(value: unknown): RequestItemField[] {
  let raw = value
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = []
    }
  }
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return []
    const candidate = entry as { id?: unknown; label?: unknown; value?: unknown }
    const common = COMMON_BY_ID.get(clean(candidate.id, 80).toLowerCase())
    const label = common?.label || clean(candidate.label, 40)
    const fieldValue = clean(candidate.value, 300)
    if (!label || !fieldValue) return []
    const baseId = common?.id || safeFieldId(candidate.id || label, `custom-${index + 1}`)
    let id = baseId
    let suffix = 2
    while (seen.has(id)) id = `${baseId}-${suffix++}`
    seen.add(id)
    return [{ id, label, value: fieldValue }]
  }).slice(0, 16)
}

export function requestItemFieldsFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const saved = normalizeRequestItemFields(metadata?.request_item_fields)
  const represented = new Set(saved.map((field) => field.id))
  const legacy = COMMON_REQUEST_ITEM_FIELDS.flatMap((field) => {
    if (represented.has(field.id)) return []
    const value = clean(metadata?.[field.metadataKey], 300)
    return value ? [{ id: field.id, label: field.label, value }] : []
  })
  return [...saved, ...legacy].slice(0, 16)
}

export function requestItemFieldsMetadata(value: unknown): Record<string, unknown> & { request_item_fields: RequestItemField[] } {
  const fields = normalizeRequestItemFields(value)
  const mirrored = Object.fromEntries(COMMON_REQUEST_ITEM_FIELDS.map((field) => {
    const selected = fields.find((candidate) => candidate.id === field.id)
    return [field.metadataKey, selected?.value || ""]
  }))
  return { request_item_fields: fields, ...mirrored }
}

export function requestItemFieldSummary(metadata: Record<string, unknown> | null | undefined) {
  return requestItemFieldsFromMetadata(metadata).map((field) => `${field.label}: ${field.value}`)
}

export function requestItemFieldDefinition(id: string) {
  return COMMON_BY_ID.get(id) || null
}

export function requestItemFieldDefinitionForMetadataKey(key: string) {
  return COMMON_BY_METADATA_KEY.get(key) || null
}

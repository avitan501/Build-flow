import { groundRecognizedRow, type RecognizedMaterialRow } from "./material-row-recognition"
import { requestItemFieldsFromMetadata, type RequestItemField } from "./request-item-fields"
import type { ReviewableMaterialItem } from "./client-material-review"

export type MaterialSpreadsheetDraft = { name: string; quantity: string; unit: string; details: string; fields: RequestItemField[] }
export function validMaterialSpreadsheetFields(fields: unknown): fields is RequestItemField[] {
  if (!Array.isArray(fields) || fields.length > 16) return false
  const ids = new Set<string>()
  return fields.every(field => {
    if (!field || typeof field.id !== 'string' || !/^[a-z0-9_-]{1,80}$/.test(field.id) || ids.has(field.id) || typeof field.label !== 'string' || !field.label.trim() || field.label.length > 40 || typeof field.value !== 'string' || !field.value.trim() || field.value.length > 300) return false
    ids.add(field.id)
    return true
  })
}
const measurements = ["width", "depth", "length", "model"] as const

export function materialSpreadsheetDraft(item: ReviewableMaterialItem): MaterialSpreadsheetDraft {
  const fields = requestItemFieldsFromMetadata(item.metadata)
  const dimensions=fields.find(f=>f.id==="dimensions")?.value
  // Only migrate dimensions that are already saved. Never refill a field the user cleared.
  const source=dimensions?`${item.name} ${dimensions} ${fields.find(f=>f.id==="length")?.value||""}`:""
  // Bridge older combined-dimension records without changing saved data or explicit edits.
  let grounded: RecognizedMaterialRow
  try { grounded = groundRecognizedRow({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit || "", width: "", depth: fields.find(f=>f.id==="thickness")?.value||"", length: "", model: "", details: "", questions: [] }, { id: item.id, text: source }) }
  catch { return { name: item.name, quantity: String(item.quantity), unit: item.unit || "", details: String(item.metadata?.request_details || ""), fields } }
  for (const id of measurements) {
    if (!fields.some(f => f.id === id) && grounded[id]) fields.push({ id, label: id === "depth" ? "Depth / thickness" : id, value: grounded[id] })
  }
  return { name: item.name, quantity: String(item.quantity), unit: item.unit || "", details: String(item.metadata?.request_details || ""), fields: fields.filter(f => !(f.id === "dimensions" && fields.some(d => d.id === "depth") && fields.some(d => d.id === "length" || d.id === "width"))) }
}

export function recognizedMaterialDraft(draft: MaterialSpreadsheetDraft, row: RecognizedMaterialRow): MaterialSpreadsheetDraft {
  const fields: RequestItemField[] = measurements.flatMap(id => row[id] ? [{ id, label: id === "depth" ? "Depth / thickness" : id, value: row[id] }] : [])
  return { name: row.name, quantity: row.quantity === null ? "" : String(row.quantity), unit: row.unit, details: row.details,
    fields: [...draft.fields.filter(f => ![...measurements, "dimensions", "thickness"].includes(f.id)), ...fields] }
}

export function editMaterialMeasurement(draft: MaterialSpreadsheetDraft, id: string, label: string, value: string): MaterialSpreadsheetDraft {
  const measurement = ["width", "depth", "length"].includes(id)
  return { ...draft, fields: [...draft.fields.filter(f => f.id !== id && !(measurement && (f.id === "dimensions" || (id === "depth" && f.id === "thickness")))), ...(value ? [{ id, label, value }] : [])] }
}

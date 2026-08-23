export type RequestMaterialChartSource = {
  request_id: string
  name: string
  department: string
  item_type: string
  quantity: number
  unit: string | null
  answers: unknown
  metadata: Record<string, unknown> | null
}

export type RequestMaterialChartRow = {
  requestId: string
  quantity: string
  item: string
  details: string
}

export function preferredRequestMaterialSources(sources: RequestMaterialChartSource[]) {
  const organized = sources.filter((source) => source.metadata?.ai_organized === true)
  return organized.length ? organized : sources
}

type LegacyAnswer = {
  label?: unknown
  question?: unknown
  value?: unknown
  answer?: unknown
}

function clean(value: unknown, max = 1000) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

function answerDetails(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const answer = entry as LegacyAnswer
    const label = clean(answer.label || answer.question, 160)
    const response = clean(answer.value || answer.answer, 500)
    return response ? [`${label || "Detail"}: ${response}`] : []
  })
}

export function toRequestMaterialChartRow(source: RequestMaterialChartSource): RequestMaterialChartRow {
  const metadataDetails = clean(source.metadata?.request_details, 2000)
  const details = [
    clean(source.metadata?.product_type, 160) && `Type: ${clean(source.metadata?.product_type, 160)}`,
    clean(source.metadata?.dimensions, 300) && `Size: ${clean(source.metadata?.dimensions, 300)}`,
    clean(source.metadata?.thickness, 160) && `Thickness: ${clean(source.metadata?.thickness, 160)}`,
    clean(source.metadata?.screw_length, 80) && `Length: ${clean(source.metadata?.screw_length, 80)}`,
    metadataDetails,
    ...answerDetails(source.answers),
  ].filter(Boolean)

  return {
    requestId: source.request_id,
    quantity: `${Number(source.quantity) || 0} ${clean(source.unit, 40) || "each"}`,
    item: clean(source.name, 500) || "Requested material",
    details: [...new Set(details)].join(" · "),
  }
}

function csvCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

export function requestMaterialChartCsv(rows: RequestMaterialChartRow[]) {
  return [
    ["Quantity", "Item", "Details"],
    ...rows.map((row) => [row.quantity, row.item, row.details]),
  ].map((row) => row.map(csvCell).join(",")).join("\r\n")
}

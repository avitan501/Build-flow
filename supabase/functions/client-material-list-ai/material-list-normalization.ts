const UNIT_SOURCE = String.raw`square\s*(?:feet|foot)|sq\.?\s*ft\.?|sq\.?|linear\s*(?:feet|foot)|sheets?|pcs?|pieces?|box(?:es)?|bags?|rolls?|bundles?|squares?|panels?|cartons?|gallons?|pails?|buckets?|tubes?|packs?|cases?|boards?|lengths?|pairs?|sets?|coils?|spools?|each|ea|lf`

export type DetectedQuantityUnit = {
  quantity: number
  unit: string
  itemText: string
}

function cleanLine(value: string) {
  return value
    .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s*)/, "")
    .replace(/^\|+|\|+$/g, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizedUnit(value: string) {
  const unit = value.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim()
  if (unit === "sq") return "squares"
  if (unit === "sq ft" || unit === "square foot" || unit === "square feet") return "square feet"
  if (unit === "lf" || unit === "linear foot" || unit === "linear feet") return "linear feet"
  if (unit === "ea") return "each"
  if (unit === "pc" || unit === "pcs") return "pieces"
  return unit
}

export function detectExplicitQuantityUnit(value: string): DetectedQuantityUnit | null {
  const line = cleanLine(value)
  if (!line) return null
  const prefix = line.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)\\s*(${UNIT_SOURCE})\\b\\s*(?:x\\s+)?(.+)$`, "i"))
  const suffix = prefix ? null : line.match(new RegExp(`^(.+?)(?:\\s*[-:–—]\\s*|\\s+)(-?\\d+(?:\\.\\d+)?)\\s*(${UNIT_SOURCE})\\b\\s*$`, "i"))
  const quantity = Number(prefix?.[1] ?? suffix?.[2])
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  return {
    quantity,
    unit: normalizedUnit(prefix?.[2] ?? suffix?.[3] ?? ""),
    itemText: (prefix?.[3] ?? suffix?.[1] ?? "").replace(/^of\s+/i, "").trim(),
  }
}

export function removeResolvedQuantityUnitReasons(reasons: string[], detected: DetectedQuantityUnit | null) {
  if (!detected) return reasons
  return reasons.filter((reason) => !/\b(?:quantity|sales?\s+unit|selling\s+unit|unit\s+(?:is\s+)?missing)\b/i.test(reason))
}

export function recognizedFastenerDimensions(name: string, sourceText: string) {
  if (!/\b(?:nails?|fasteners?)\b/i.test(name)) return ""
  const normalized = sourceText.replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ")
  const match = normalized.match(/(\d+(?:\s+\d+\s*\/\s*\d+|\s*\/\s*\d+|(?:\.\d+)?))\s*(?:"|in(?:\.|ch(?:es)?)?)\s*[x×]\s*(?:0?\.)?(\d{2,3})\b/i)
  if (!match) return ""
  const length = match[1].replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/")
  return `${length} in. length x 0.${match[2]} in. shank`
}

export function removeResolvedFastenerReasons(reasons: string[], dimensions: string) {
  if (!dimensions) return reasons
  return reasons.filter((reason) => !/\b(?:shank|diameter|nail\s+(?:size|length)|fastener\s+(?:size|dimension)|clarify\s+whether)\b/i.test(reason))
}

function thicknessMeasurements(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
  const matches = normalized.matchAll(/(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*("|in(?:\.|ch(?:es)?)?|mm|cm|mil|gauge|ga)(?=\s|$|[,;:)])/gi)
  return [...matches].map((match) => ({
    amount: match[1].replace(/\s+/g, ""),
    unit: /^(?:"|in)/i.test(match[2]) ? "in" : /^(?:ga|gauge)$/i.test(match[2]) ? "gauge" : match[2].toLowerCase(),
  }))
}

export function verifiedThickness(value: string, sourceText: string) {
  const candidate = value.trim().replace(/\s+/g, " ")
  if (!candidate) return ""
  const candidateMeasurements = thicknessMeasurements(candidate)
  if (!candidateMeasurements.length) return ""
  const sourceMeasurements = thicknessMeasurements(sourceText)
  return candidateMeasurements.some((candidateMeasurement) => sourceMeasurements.some((sourceMeasurement) =>
    candidateMeasurement.amount === sourceMeasurement.amount && candidateMeasurement.unit === sourceMeasurement.unit
  )) ? candidate : ""
}

export function materialRequiresThickness(name: string) {
  if (/\b(?:screws?|nails?|fasteners?|anchors?)\b/i.test(name)) return false
  return /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard|cement\s+board|wonderboard|plywood|osb)\b/i.test(name)
}

export function dimensionalLumberNeedsType(name: string, sourceText: string) {
  const product = `${name} ${sourceText}`.toLowerCase().replace(/\s+/g, " ")
  const dimensionalLumber = /\b(?:lumber|studs?|framing\s+boards?)\b/.test(product)
    || (/\bwood(?:en)?\b/.test(product) && /\b\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\b/.test(product))
  if (!dimensionalLumber) return false
  if (/\b(?:metal|steel)\s+(?:studs?|framing)\b|\b(?:plywood|osb|lvl|engineered\s+lumber|glulam|drywall|sheetrock|gypsum|cement\s+board|wonderboard)\b/.test(product)) return false
  const hasType = /\b(?:regular(?:\s+(?:spf|lumber|wood))?|spf|spruce(?:-pine-fir)?|doug(?:las)?\s+fir|hem(?:lock)?[- ]fir|southern\s+yellow\s+pine|syp|cedar|redwood|pressure[- ]treated|treated|pt\s+lumber|kiln[- ]dried|kd\s+lumber|fire[- ]retardant|frt|stud\s+grade|construction\s+grade|select\s+structural|no\.?\s*[123]|#[123])\b/.test(product)
  return !hasType
}

export function fastenerNeedsLength(name: string, sourceText: string) {
  if (!/\b(?:screws?|nails?|fasteners?|anchors?)\b/i.test(name)) return false
  const product = `${name} ${sourceText}`
    .toLowerCase()
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
  if (recognizedFastenerDimensions(name, product)) return false
  const hasLength = /\b\d+(?:[- ]\d+\/\d+|\s*\/\s*\d+|\.\d+)?\s*(?:"|in(?:\.|ch(?:es)?)?)\b/i.test(product)
    || /\b\d+(?:\.\d+)?\s*(?:mm|cm)\b/i.test(product)
  return !hasLength
}

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

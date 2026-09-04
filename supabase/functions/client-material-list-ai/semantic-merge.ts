export type SemanticMaterialItem = {
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

const MATERIAL_ALIASES: Array<[RegExp, string]> = [
  [/\b(?:sheet\s*rock|she+t+ro+ck|sheet\s*rok|gypsum\s+(?:board|panel)|wall\s*board|wallboard|dry\s*wall)\b/g, "drywall"],
  [/\b(?:panel|placa)\s+de\s+yeso\b|\btablaroca\b/g, "drywall"],
  [/\b(?:plaster\s*board|plasterboard)\b/g, "drywall"],
  [/\b(?:pieces?|pcs?|ea|each)\b/g, "each"],
  [/\b(?:sheets?)\b/g, "sheet"],
  [/\b(?:boxes?)\b/g, "box"],
  [/\b(?:rolls?)\b/g, "roll"],
]

const CRITICAL_QUALIFIERS = [
  "regular",
  "type x",
  "fire rated",
  "moisture resistant",
  "mold resistant",
  "pressure treated",
  "untreated",
  "exterior",
  "interior",
] as const

function normalize(value: unknown) {
  let normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[“”″]/g, " in ")
    .replace(/[‘’′]/g, " ft ")
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1 x $2")
    .replace(/\b(inches|inch)\b/g, "in")
    .replace(/\b(feet|foot)\b/g, "ft")
  for (const [pattern, replacement] of MATERIAL_ALIASES) normalized = normalized.replace(pattern, replacement)
  return normalized.replace(/[^a-z0-9./]+/g, " ").replace(/\s+/g, " ").trim()
}

function canonicalUnit(value: unknown) {
  return normalize(value).replace(/s$/, "")
}

function normalizedMeasures(value: unknown) {
  const normalized = normalize(value)
  return [...new Set([
    ...(normalized.match(/\b\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?\s*(?:in|ft)\b/g) ?? []),
    ...(normalized.match(/\b\d+(?:\.\d+)?(?:\s*x\s*\d+(?:\.\d+)?){1,2}(?:\s*(?:in|ft))?\b/g) ?? []),
  ].map((measure) => measure.replace(/\s+/g, " ").trim()))].sort()
}

function qualifiers(value: unknown) {
  const normalized = normalize(value)
  return new Set(CRITICAL_QUALIFIERS.filter((qualifier) => normalized.includes(qualifier)))
}

function materialIdentity(item: SemanticMaterialItem) {
  return normalize(item.name)
    .replace(/\b\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?\s*(?:in|ft)\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?(?:\s*x\s*\d+(?:\.\d+)?){1,2}(?:\s*(?:in|ft))?\b/g, " ")
    .replace(/\b(?:regular|type x|fire rated|moisture resistant|mold resistant|pressure treated|untreated|exterior|interior)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function compatibleSpecifications(left: SemanticMaterialItem, right: SemanticMaterialItem) {
  if (normalize(left.department) !== normalize(right.department)) return false
  if (canonicalUnit(left.unit) !== canonicalUnit(right.unit)) return false
  if (!materialIdentity(left) || materialIdentity(left) !== materialIdentity(right)) return false

  const leftMeasures = normalizedMeasures([left.name, left.dimensions, left.thickness, left.details].join(" "))
  const rightMeasures = normalizedMeasures([right.name, right.dimensions, right.thickness, right.details].join(" "))
  if (leftMeasures.join("|") !== rightMeasures.join("|")) return false

  const leftQualifiers = qualifiers([left.name, left.dimensions, left.thickness, left.details].join(" "))
  const rightQualifiers = qualifiers([right.name, right.dimensions, right.thickness, right.details].join(" "))
  const sameQualifiers = [...leftQualifiers].every((value) => rightQualifiers.has(value))
    && [...rightQualifiers].every((value) => leftQualifiers.has(value))
  if (!sameQualifiers) return false
  return true
}

function joinUnique(left: string, right: string, separator = " · ") {
  const values = [left, right].map((value) => value.trim()).filter(Boolean)
  return [...new Set(values)].join(separator)
}

function worstStatus(left: SemanticMaterialItem["reviewStatus"], right: SemanticMaterialItem["reviewStatus"]) {
  const rank = { ready: 0, check: 1, missing: 2 } as const
  return rank[left] >= rank[right] ? left : right
}

export function mergeSemanticallyEquivalentMaterialItems<T extends SemanticMaterialItem>(items: T[]) {
  const merged: T[] = []
  for (const item of items) {
    const index = merged.findIndex((candidate) => compatibleSpecifications(candidate, item))
    if (index < 0) {
      merged.push({ ...item, reviewReasons: [...item.reviewReasons] })
      continue
    }

    const current = merged[index]
    const sameEvidence = normalize(current.sourceText) === normalize(item.sourceText)
    const leftQuantity = Number(current.quantity) > 0 ? Number(current.quantity) : 0
    const rightQuantity = Number(item.quantity) > 0 ? Number(item.quantity) : 0
    merged[index] = {
      ...current,
      quantity: sameEvidence ? Math.max(leftQuantity, rightQuantity) : leftQuantity + rightQuantity,
      dimensions: joinUnique(current.dimensions, item.dimensions),
      thickness: joinUnique(current.thickness, item.thickness),
      details: joinUnique(current.details, item.details),
      sourceText: joinUnique(current.sourceText, item.sourceText, "\n"),
      needsReview: current.needsReview || item.needsReview,
      reviewStatus: worstStatus(current.reviewStatus, item.reviewStatus),
      reviewReasons: [...new Set([...current.reviewReasons, ...item.reviewReasons])].slice(0, 5),
    }
  }
  return merged
}

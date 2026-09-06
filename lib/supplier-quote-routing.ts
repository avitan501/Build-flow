type DirectorySupplier = { id: string; name: string }

type QuoteMatchItem = {
  id: string
  item_code?: string | null
  comparison_item_id?: string | null
  description: string
  specification: string
}

type RequestMatchItem = {
  id: string
  description: string
  specification: string
}

type RequestSourceItem = {
  id: string
  name?: string
  metadata: Record<string, unknown> | null
}

function isRawFreeTextContainer(item: RequestSourceItem) {
  return clean(item.name, 300).toLowerCase() === "free-text material list"
}

type RequestComparisonSourceItem = RequestSourceItem & {
  name: string
  quantity: number
  unit: string | null
  department: string
}

type ExistingRequestComparisonItem = RequestMatchItem & {
  source_request_item_id: string | null
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
}

export function resolveExplicitSupplierSelection(
  suppliers: DirectorySupplier[],
  selectedId: string,
) {
  const safeId = clean(selectedId, 160)
  if (!safeId) return null
  const match = suppliers.find((supplier) => supplier.id === safeId)
  if (!match) return null
  const name = clean(match.name, 200)
  return name ? { id: match.id, name } : null
}

export function requestItemSpecification(
  metadata: Record<string, unknown> | null | undefined,
  fallbackDepartment: string,
) {
  const values = [
    clean(metadata?.product_type, 160),
    clean(metadata?.dimensions, 300),
    clean(metadata?.thickness, 160),
    clean(metadata?.screw_length, 80),
    clean(metadata?.request_details, 1000),
  ].filter(Boolean)
  return [...new Set(values)].join(" · ") || clean(fallbackDepartment, 1000)
}

export function effectiveRequestComparisonItems<T extends RequestSourceItem>(items: T[]) {
  const organizedItems = items.filter((item) => item.metadata?.ai_organized === true)
  if (!organizedItems.length) {
    // This row stores the client's whole message while AI organization is in
    // progress. It is not a material and must never become a priced line.
    return items.filter(
      (item) => item.metadata?.ai_organized !== true && !isRawFreeTextContainer(item),
    )
  }

  const organizedSourceIds = new Set(
    organizedItems.flatMap((item) =>
      typeof item.metadata?.source_item_id === "string"
        ? [item.metadata.source_item_id]
        : [],
    ),
  )
  return [
    ...organizedItems,
    ...items.filter(
      (item) =>
        item.metadata?.ai_organized !== true &&
        !isRawFreeTextContainer(item) &&
        !organizedSourceIds.has(item.id),
    ),
  ]
}

export function planRequestComparisonSync<
  TRequest extends RequestComparisonSourceItem,
  TExisting extends ExistingRequestComparisonItem,
>(requestItems: TRequest[], existingItems: TExisting[]) {
  const currentItems = effectiveRequestComparisonItems(requestItems)
  const currentSourceIds = new Set(currentItems.map((item) => item.id))
  const existingBySourceId = new Map(
    existingItems.flatMap((item) =>
      item.source_request_item_id
        ? [[item.source_request_item_id, item] as const]
        : [],
    ),
  )
  const missingItems = currentItems.filter((item) => !existingBySourceId.has(item.id))
  const obsoleteItems = existingItems.filter(
    (item) =>
      !item.source_request_item_id ||
      !currentSourceIds.has(item.source_request_item_id),
  )
  const semanticTransfers = matchSupplierQuoteItems(
    missingItems.map((item) => ({
      id: item.id,
      description: item.name,
      specification: requestItemSpecification(item.metadata, item.department),
    })),
    obsoleteItems,
  )
  return { currentItems, existingBySourceId, missingItems, obsoleteItems, semanticTransfers }
}

const COMPARISON_NOISE_WORDS = new Set([
  "day", "days", "week", "weeks", "lead", "time", "item", "sells",
  "non", "coded", "special", "specials", "cancellable", "cancelable",
  "returnable", "price", "net", "total", "each", "ea", "pc", "pcs",
])

function comparisonWords(value: string) {
  return new Set(
    normalizedComparisonText(value)
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 1 && !COMPARISON_NOISE_WORDS.has(word)),
  )
}

function normalizedComparisonText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”″]/g, " in ")
    .replace(/[‘’′]/g, " ft ")
    .replace(/\b(?:sheet\s*rock|she+t+ro+ck|sheet\s*rok|gypsum\s+(?:board|panel)|wall\s*board|wallboard|dry\s*wall)\b/g, "drywall")
    .replace(/\b(?:panel|placa)\s+de\s+yeso\b|\btablaroca\b/g, "drywall")
    .replace(/\b(?:assy|asy|asmy|assembl)\b/g, "assembly")
    .replace(/\b(?:vlv|valved)\b/g, "valve")
    .replace(/\bcapped\b/g, "cap")
    .replace(/\brpz\b/g, "reduced pressure zone backflow")
    .replace(/\bbfp\b/g, "backflow preventer")
    .replace(/\bos\s*&?\s*y\b|\bosy\b/g, "outside screw yoke")
    .replace(/\b(inches|inch)\b/g, "in")
    .replace(/\b(feet|foot)\b/g, "ft")
    .replace(/[^a-z0-9./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function comparisonMeasures(value: string) {
  const normalized = normalizedComparisonText(value)
  return [...new Set([
    ...(normalized.match(/\b\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?\s*(?:in|ft)\b/g) ?? []),
    ...(normalized.match(/\b\d+(?:\.\d+)?(?:\s+x\s+\d+(?:\.\d+)?){1,2}(?:\s*(?:in|ft))?\b/g) ?? []),
  ])].sort()
}

function comparisonQualifiers(value: string) {
  const normalized = normalizedComparisonText(value)
  return new Set([
    "regular",
    "type x",
    "fire rated",
    "moisture resistant",
    "mold resistant",
    "pressure treated",
    "untreated",
  ].filter((qualifier) => normalized.includes(qualifier)))
}

function comparisonModelCodes(value: string) {
  const normalized = normalizedComparisonText(value)
  return new Set(
    normalized
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ""))
      .filter((word) => word.length >= 3 && /[a-z]/.test(word) && /\d/.test(word)),
  )
}

function hasConflictingSpecifications(left: string, right: string) {
  const leftMeasures = comparisonMeasures(left)
  const rightMeasures = comparisonMeasures(right)
  // A supplier often prints a fuller size than a short client request. That is
  // safe to rank when the request itself has no size; the opposite is not.
  if (rightMeasures.length && leftMeasures.join("|") !== rightMeasures.join("|")) return true
  const leftQualifiers = comparisonQualifiers(left)
  const rightQualifiers = comparisonQualifiers(right)
  return [...leftQualifiers].some((qualifier) => !rightQualifiers.has(qualifier))
    || [...rightQualifiers].some((qualifier) => !leftQualifiers.has(qualifier))
}

function comparisonMatchScore(
  quoteItem: QuoteMatchItem,
  requestItem: RequestMatchItem,
) {
  const quoteText =
    `${quoteItem.item_code || ""} ${quoteItem.description} ${quoteItem.specification}`.trim()
  const requestText =
    `${requestItem.description} ${requestItem.specification}`.trim()
  if (hasConflictingSpecifications(quoteText, requestText)) return 0
  const normalizedQuote = normalizedComparisonText(quoteText)
  const normalizedRequest = normalizedComparisonText(requestText)
  if (normalizedQuote === normalizedRequest) return 10
  if (
    normalizedQuote.includes(normalizedRequest) ||
    normalizedRequest.includes(normalizedQuote)
  ) return 5
  const quoteWords = comparisonWords(quoteText)
  const requestWords = comparisonWords(requestText)
  const overlap = [...quoteWords].filter((word) => requestWords.has(word))
  const quoteModels = comparisonModelCodes(quoteText)
  const requestModels = comparisonModelCodes(requestText)
  const sharedModels = [...quoteModels].filter((model) => requestModels.has(model))
  const weightedOverlap = overlap.reduce((score, word) => score + (/\d/.test(word) ? 2 : word.length >= 6 ? 1.5 : 1), 0)
  const quoteWeight = [...quoteWords].reduce((score, word) => score + (/\d/.test(word) ? 2 : word.length >= 6 ? 1.5 : 1), 0)
  const requestWeight = [...requestWords].reduce((score, word) => score + (/\d/.test(word) ? 2 : word.length >= 6 ? 1.5 : 1), 0)
  const textScore = weightedOverlap / Math.max(quoteWeight, requestWeight, 1)
  return sharedModels.length ? Math.max(2.5, textScore) : textScore
}

export function matchSupplierQuoteItems<TQuote extends QuoteMatchItem, TRequest extends RequestMatchItem>(
  quoteItems: TQuote[],
  requestItems: TRequest[],
  minimumScore = 0.3,
) {
  const requestById = new Map(requestItems.map((item) => [item.id, item]))
  const explicit = quoteItems.flatMap((item) => {
    const comparisonItem = item.comparison_item_id ? requestById.get(item.comparison_item_id) : null
    return comparisonItem ? [{ item, comparisonItem }] : []
  })
  const explicitCounts = new Map<string, number>()
  for (const { comparisonItem } of explicit) {
    explicitCounts.set(comparisonItem.id, (explicitCounts.get(comparisonItem.id) ?? 0) + 1)
  }
  const duplicateExplicitIds = new Set([...explicitCounts].flatMap(([id, count]) => count > 1 ? [id] : []))
  const safeExplicit = explicit.filter(({ comparisonItem }) => !duplicateExplicitIds.has(comparisonItem.id))
  const usedQuoteIds = new Set(explicit.map(({ item }) => item.id))
  const usedRequestIds = new Set(explicit.map(({ comparisonItem }) => comparisonItem.id))
  const candidates = quoteItems.flatMap((quoteItem, quoteIndex) =>
    usedQuoteIds.has(quoteItem.id) ? [] : requestItems.flatMap((requestItem, requestIndex) => usedRequestIds.has(requestItem.id) ? [] : [{
      quoteItem,
      quoteIndex,
      requestItem,
      requestIndex,
      score: comparisonMatchScore(quoteItem, requestItem),
    }]),
  ).filter((candidate) => candidate.score >= minimumScore)
    .sort((left, right) => right.score - left.score || left.quoteIndex - right.quoteIndex || left.requestIndex - right.requestIndex)

  const matches: Array<{ item: TQuote; comparisonItem: TRequest }> = [...safeExplicit]
  for (const candidate of candidates) {
    if (usedQuoteIds.has(candidate.quoteItem.id) || usedRequestIds.has(candidate.requestItem.id)) continue
    const alternatives = candidates.filter((entry) => entry.quoteItem.id === candidate.quoteItem.id && !usedRequestIds.has(entry.requestItem.id))
    const runnerUp = alternatives.find((entry) => entry.requestItem.id !== candidate.requestItem.id)
    if (runnerUp && candidate.score - runnerUp.score < 0.15) continue
    usedQuoteIds.add(candidate.quoteItem.id)
    usedRequestIds.add(candidate.requestItem.id)
    matches.push({ item: candidate.quoteItem, comparisonItem: candidate.requestItem })
  }
  return matches.sort((left, right) => quoteItems.findIndex((item) => item.id === left.item.id) - quoteItems.findIndex((item) => item.id === right.item.id))
}

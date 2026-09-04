type DirectorySupplier = { id: string; name: string }

type QuoteMatchItem = {
  id: string
  item_code?: string | null
  description: string
  specification: string
}

type RequestMatchItem = {
  id: string
  description: string
  specification: string
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

function comparisonWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 1),
  )
}

function normalizedComparisonText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”″]/g, " in ")
    .replace(/[‘’′]/g, " ft ")
    .replace(/\b(?:sheet\s*rock|she+t+ro+ck|sheet\s*rok|gypsum\s+(?:board|panel)|wall\s*board|wallboard|dry\s*wall)\b/g, "drywall")
    .replace(/\b(?:panel|placa)\s+de\s+yeso\b|\btablaroca\b/g, "drywall")
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

function hasConflictingSpecifications(left: string, right: string) {
  const leftMeasures = comparisonMeasures(left)
  const rightMeasures = comparisonMeasures(right)
  if (leftMeasures.join("|") !== rightMeasures.join("|")) return true
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
  const overlap = [...quoteWords].filter((word) => requestWords.has(word)).length
  return overlap / Math.max(quoteWords.size, requestWords.size, 1)
}

export function matchSupplierQuoteItems<TQuote extends QuoteMatchItem, TRequest extends RequestMatchItem>(
  quoteItems: TQuote[],
  requestItems: TRequest[],
  minimumScore = 0.3,
) {
  const candidates = quoteItems.flatMap((quoteItem, quoteIndex) =>
    requestItems.map((requestItem, requestIndex) => ({
      quoteItem,
      quoteIndex,
      requestItem,
      requestIndex,
      score: comparisonMatchScore(quoteItem, requestItem),
    })),
  ).filter((candidate) => candidate.score >= minimumScore)
    .sort((left, right) => right.score - left.score || left.quoteIndex - right.quoteIndex || left.requestIndex - right.requestIndex)

  const usedQuoteIds = new Set<string>()
  const usedRequestIds = new Set<string>()
  const matches: Array<{ item: TQuote; comparisonItem: TRequest }> = []
  for (const candidate of candidates) {
    if (usedQuoteIds.has(candidate.quoteItem.id) || usedRequestIds.has(candidate.requestItem.id)) continue
    usedQuoteIds.add(candidate.quoteItem.id)
    usedRequestIds.add(candidate.requestItem.id)
    matches.push({ item: candidate.quoteItem, comparisonItem: candidate.requestItem })
  }
  return matches.sort((left, right) => quoteItems.findIndex((item) => item.id === left.item.id) - quoteItems.findIndex((item) => item.id === right.item.id))
}

export type ClientQuoteDraft = {
  version: 1
  clientId: string
  quoteNumber: string
  clientMessage: string
  delivery: string
  tax: string
  bulkMarkup: string
  prices: Record<string, { markupPercent: string; clientUnitPrice: string }>
}

export type ClientQuoteDraftEnvelope = {
  draft: ClientQuoteDraft | null
  source: unknown
  draftSource: unknown
  revision: number
  updatedBy: string | null
  updatedAt: string | null
  actorId: string
  locked: boolean
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value))
export function parseClientQuoteDraft(value: unknown): ClientQuoteDraft | null {
  if (!object(value) || value.version !== 1 || !object(value.prices)) return null
  const fields = { clientId: 100, quoteNumber: 40, clientMessage: 4000, delivery: 60, tax: 60, bulkMarkup: 60 }
  if (Object.keys(value).some(key => !["version", "prices", ...Object.keys(fields)].includes(key))) return null
  for (const [key, limit] of Object.entries(fields)) if (typeof value[key] !== "string" || value[key].length > limit) return null
  if (value.clientId !== "" && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(value.clientId))) return null
  if (Object.keys(value.prices).length > 1000) return null
  for (const [id, price] of Object.entries(value.prices)) {
    if (!/^[a-z0-9-]{1,100}$/i.test(id) || !object(price) || Object.keys(price).some(key => !["markupPercent", "clientUnitPrice"].includes(key))
      || typeof price.markupPercent !== "string" || price.markupPercent.length > 60
      || typeof price.clientUnitPrice !== "string" || price.clientUnitPrice.length > 60) return null
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > 180000) return null
  return value as ClientQuoteDraft
}

export function draftSourcesEqual(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : object(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
}

/** Draft storage intentionally accepts incomplete numbers; publishing does not. */
export const validClientQuoteNumber = (raw: string) => raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0

export function completeClientQuotePricing(draft: ClientQuoteDraft) {
  return Boolean(validClientQuoteNumber(draft.tax) && Number(draft.tax) <= 100
    && (draft.delivery.trim() === "" || validClientQuoteNumber(draft.delivery)) && Object.keys(draft.prices).length
    && Object.values(draft.prices).every(price => validClientQuoteNumber(price.clientUnitPrice) && validClientQuoteNumber(price.markupPercent)))
}

export function completeClientQuoteDraft(draft: ClientQuoteDraft) {
  return Boolean(draft.clientId && draft.quoteNumber.trim().length >= 3 && completeClientQuotePricing(draft))
}

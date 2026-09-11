/** Known intake envelopes are source documents, never purchasable products. */
export function isRequestIntakePlaceholder(item: {
  name?: string
  unit?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const name = (item.name ?? "").trim().toLowerCase()
  if (name === "free-text material list") return true
  if (item.metadata?.ai_organized === true) return false
  const publicEnvelope = ["construction quote request", "beat a store quote"].includes(name)
  return publicEnvelope && ((item.unit ?? "").trim().toLowerCase() === "request"
    || ["public_quote_form", "beat_a_quote_form"].includes(String(item.metadata?.source ?? "")))
}

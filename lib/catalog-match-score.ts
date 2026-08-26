const STOP_WORDS = new Set([
  "a", "an", "and", "at", "each", "for", "from", "in", "item", "near", "of", "or", "the", "to", "with",
])

function tokens(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

/** A transparent text/specification similarity score, not a stock or fit guarantee. */
export function catalogMatchScore(query: string, title: string, source = "") {
  const queryTokens = tokens(query)
  if (!queryTokens.length) return 0
  const haystack = `${title} ${source}`.toLowerCase()
  const weighted = queryTokens.map((token) => ({
    token,
    weight: /\d/.test(token) ? 4 : token.length >= 7 ? 2 : 1,
  }))
  const possible = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  const matched = weighted.reduce((sum, entry) => sum + (haystack.includes(entry.token) ? entry.weight : 0), 0)
  return Math.max(1, Math.min(99, Math.round((matched / possible) * 100)))
}

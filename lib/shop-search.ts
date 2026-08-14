const SEARCH_ALIASES: Record<string, string[]> = {
  drywall: ["sheetrock", "sheet rock", "sheetrok", "shetrock", "gypsum board"],
  framing: ["frameing", "framming", "lumber", "wood studs", "studs"],
  flooring: ["floor", "floors", "wood floor", "hardwood", "floring"],
  electrical: ["electric", "wiring", "wire", "romex", "bx"],
  roofing: ["roof", "shingles", "roffing"],
  siding: ["sideing", "vinyl siding", "house siding"],
  tile: ["tiles", "tiling", "thinset", "grout"],
  windows: ["window", "window schedule"],
  doors: ["door", "molding", "trim"],
}

export function normalizeShopSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + Number(left[leftIndex - 1] !== right[rightIndex - 1]),
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[right.length]
}

function expandedTerms(query: string) {
  const normalized = normalizeShopSearch(query)
  const terms = normalized.split(/\s+/).filter(Boolean)

  for (const [canonical, aliases] of Object.entries(SEARCH_ALIASES)) {
    if (canonical === normalized || aliases.some((alias) => normalizeShopSearch(alias) === normalized)) {
      return [canonical, ...aliases.map(normalizeShopSearch)]
    }
  }

  return terms
}

function termMatches(term: string, haystack: string, words: string[]) {
  if (haystack.includes(term)) return true
  const tolerance = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0
  return tolerance > 0 && words.some((word) => Math.abs(word.length - term.length) <= tolerance && editDistance(term, word) <= tolerance)
}

export function shopSearchMatches(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = normalizeShopSearch(query)
  if (!normalizedQuery) return true

  const haystack = normalizeShopSearch(values.filter(Boolean).join(" "))
  const words = haystack.split(/\s+/).filter(Boolean)
  const directTerms = normalizedQuery.split(/\s+/).filter(Boolean)
  if (directTerms.every((term) => termMatches(term, haystack, words))) return true

  return expandedTerms(normalizedQuery).some((term) => termMatches(term, haystack, words))
}

export function shopSearchSuggestions(query: string, choices: readonly string[], limit = 6) {
  const normalizedQuery = normalizeShopSearch(query)
  if (!normalizedQuery) return choices.slice(0, limit)

  return choices
    .map((choice, index) => {
      const normalizedChoice = normalizeShopSearch(choice)
      const matches = shopSearchMatches(normalizedQuery, [choice])
      const score = normalizedChoice === normalizedQuery ? 0 : normalizedChoice.startsWith(normalizedQuery) ? 1 : normalizedChoice.includes(normalizedQuery) ? 2 : matches ? 3 : 10
      return { choice, index, score }
    })
    .filter((entry) => entry.score < 10)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, limit)
    .map((entry) => entry.choice)
}

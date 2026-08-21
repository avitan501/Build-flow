import "server-only"

export type ExaCatalogSearchInput = {
  query: string
  department?: string
  zipCode?: string
  domains?: string[]
}

export type ExaCatalogSearchResult = {
  title: string
  url: string
  domain: string
  snippet: string
  imageUrl: string | null
  priceText: string | null
  publishedDate: string | null
}

type ExaResponse = {
  results?: Array<{
    title?: string
    url?: string
    publishedDate?: string
    image?: string
    text?: string
    highlights?: string[]
  }>
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""
}

function exactUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : ""
  } catch {
    return ""
  }
}

function findPrice(value: string) {
  const match = value.match(/(?:US\s*)?\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$\s?\d+(?:\.\d{2})?/i)
  return match?.[0] ?? null
}

export async function searchCatalogWithExa(input: ExaCatalogSearchInput) {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) return { ok: false as const, code: "not_configured" as const, error: "Exa is not connected yet. Add EXA_API_KEY to the Avantia Vercel project." }

  const query = clean(input.query, 240)
  if (!query) return { ok: false as const, code: "invalid" as const, error: "Enter a product or material to search for." }
  const department = clean(input.department, 100)
  const zipCode = clean(input.zipCode, 12)
  const location = zipCode ? ` near ZIP code ${zipCode}` : ""
  const category = department ? ` for the ${department} construction department` : ""
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      query: `${query}${category}${location}. Find exact product pages, not search or category pages.`,
      type: "auto",
      numResults: 8,
      contents: { highlights: { maxCharacters: 1200 } },
      ...(input.domains?.length ? { includeDomains: input.domains.slice(0, 5) } : {}),
    }),
    cache: "no-store",
  })
  if (!response.ok) {
    console.error("Exa catalog search failed", { status: response.status })
    return { ok: false as const, code: "provider_error" as const, error: "Exa could not complete the search. Try again later." }
  }

  const payload = await response.json() as ExaResponse
  const results = (payload.results ?? []).flatMap((result) => {
    const url = exactUrl(clean(result.url, 2000))
    const title = clean(result.title, 300)
    if (!url || !title) return []
    const source = clean((result.highlights ?? []).join(" ") || result.text, 1600)
    let domain = ""
    try { domain = new URL(url).hostname.replace(/^www\./, "") } catch { /* validated above */ }
    return [{
      title,
      url,
      domain,
      snippet: source,
      imageUrl: exactUrl(clean(result.image, 2000)) || null,
      priceText: findPrice(source),
      publishedDate: clean(result.publishedDate, 40) || null,
    }]
  })
  return { ok: true as const, results }
}

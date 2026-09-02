import "server-only"

import { unstable_cache } from "next/cache"

import { catalogMatchScore } from "@/lib/catalog-match-score"

export type ExaCatalogSearchInput = {
  query: string
  department?: string
  zipCode?: string
  domains?: string[]
  excludeDomains?: string[]
}

export type ExaCatalogSearchResult = {
  title: string
  url: string
  domain: string
  snippet: string
  imageUrl: string | null
  priceText: string | null
  publishedDate: string | null
  matchConfidence: "exact" | "likely"
  matchScore: number
}

export type ProductCallResult = {
  title: string
  url: string
  domain: string
  snippet: string
  phone: string | null
  matchConfidence: "exact" | "likely"
  matchScore: number
}

export type ProductSalesContact = {
  company: string
  contactName: string | null
  role: string
  phone: string | null
  email: string | null
  url: string
  domain: string
}

export type ProductSearchLink = { label: string; url: string }

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

function isSearchPage(value: string) {
  try {
    const url = new URL(value)
    return /(^|\/)(search|s)(\/|$)/i.test(url.pathname)
      || ["q", "query", "search", "searchTerm", "keyword", "tbm"].some((key) => url.searchParams.has(key))
  } catch {
    return true
  }
}

export function productSearchLinks(queryValue: string, zipCodeValue = ""): ProductSearchLink[] {
  const query = clean(queryValue, 240)
  const zipCode = clean(zipCodeValue, 12)
  const encoded = encodeURIComponent([query, zipCode && `near ${zipCode}`].filter(Boolean).join(" "))
  return [
    { label: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${encoded}` },
    { label: "The Home Depot", url: `https://www.homedepot.com/s/${encoded}` },
    { label: "Lowe's", url: `https://www.lowes.com/search?searchTerm=${encoded}` },
  ]
}

async function runExaSearch(query: string, department: string, zipCode: string, domains: string[], excludeDomains: string[]) {
  const apiKey = process.env.EXA_API_KEY!
  const location = zipCode ? ` near ZIP code ${zipCode}` : ""
  const category = department ? ` for the ${department} construction department` : ""
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      query: `${query}${category}${location}. Find the exact purchasable construction product from multiple suppliers. Return direct product detail pages with a current displayed price, model, size, and package quantity. Exclude search, category, article, and installation-service pages.`,
      type: "deep-lite",
      numResults: 18,
      contents: { highlights: { query: "current product price model size package quantity availability", maxCharacters: 1800 }, maxAgeHours: 0 },
      ...(domains.length ? { includeDomains: domains } : {}),
      ...(excludeDomains.length ? { excludeDomains } : {}),
    }),
  })
  if (!response.ok) {
    console.error("Exa catalog search failed", { status: response.status })
    throw new Error(`exa_${response.status}`)
  }

  const payload = await response.json() as ExaResponse
  const results = (payload.results ?? []).flatMap((result) => {
    const url = exactUrl(clean(result.url, 2000))
    const title = clean(result.title, 300)
    if (!url || !title || isSearchPage(url)) return []
    const source = clean((result.highlights ?? []).join(" ") || result.text, 1600)
    const priceText = findPrice(source)
    if (!priceText) return []
    let domain = ""
    try { domain = new URL(url).hostname.replace(/^www\./, "") } catch { /* validated above */ }
    const matchScore = catalogMatchScore(query, title, source)
    return [{
      title,
      url,
      domain,
      snippet: source,
      imageUrl: exactUrl(clean(result.image, 2000)) || null,
      priceText,
      publishedDate: clean(result.publishedDate, 40) || null,
      matchConfidence: matchScore >= 85 ? "exact" as const : "likely" as const,
      matchScore,
    }]
  })
  return { ok: true as const, results, checkedAt: new Date().toISOString() }
}

const cachedExaSearch = unstable_cache(runExaSearch, ["exa-catalog-search-v4"], { revalidate: 3_600 })

export async function searchCatalogWithExa(input: ExaCatalogSearchInput) {
  const query = clean(input.query, 240)
  const zipCode = clean(input.zipCode, 12)
  const fallbackLinks = productSearchLinks(query, zipCode)
  if (!query) return { ok: false as const, code: "invalid" as const, error: "Enter a product or material to search for.", fallbackLinks }
  if (!process.env.EXA_API_KEY) return { ok: false as const, code: "not_configured" as const, error: "Live price search is not connected. Use the retailer links below.", fallbackLinks }

  const department = clean(input.department, 100)
  const domains = (input.domains ?? []).map((domain) => clean(domain, 120)).filter(Boolean).slice(0, 5)
  const excludeDomains = (input.excludeDomains ?? []).map((domain) => clean(domain, 120)).filter(Boolean).slice(0, 12)
  try {
    return { ...await cachedExaSearch(query, department, zipCode, domains, excludeDomains), fallbackLinks }
  } catch {
    return { ok: false as const, code: "provider_error" as const, error: "Live price search could not be completed. Use the retailer links below.", fallbackLinks }
  }
}

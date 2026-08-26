import "server-only"

import type { LocationSuggestion } from "@/lib/location-types"

type CensusMatch = {
  matchedAddress?: unknown
  coordinates?: { x?: unknown; y?: unknown }
  addressComponents?: { city?: unknown; state?: unknown; zip?: unknown }
  geographies?: { Counties?: Array<{ NAME?: unknown }> }
}

type PhotonFeature = {
  geometry?: { coordinates?: unknown[] }
  properties?: Record<string, unknown>
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function coordinate(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function recommendedSalesTax(state: string, county: string) {
  const normalizedState = state.trim().toUpperCase()
  const normalizedCounty = county.trim().toLowerCase()
  if (normalizedState === "NY" && normalizedCounty.includes("nassau")) return { rate: 8.625, jurisdiction: "Nassau County, NY" }
  if (normalizedState === "NJ") return { rate: 6.625, jurisdiction: "New Jersey" }
  return { rate: null, jurisdiction: "" }
}

function censusSuggestion(match: CensusMatch): LocationSuggestion | null {
  const latitude = coordinate(match.coordinates?.y)
  const longitude = coordinate(match.coordinates?.x)
  const label = text(match.matchedAddress)
  if (!label || latitude === null || longitude === null) return null
  const city = text(match.addressComponents?.city)
  const state = text(match.addressComponents?.state).toUpperCase()
  const postalCode = text(match.addressComponents?.zip)
  const county = text(match.geographies?.Counties?.[0]?.NAME)
  const tax = recommendedSalesTax(state, county)
  return { label, name: "", latitude, longitude, city, state, postalCode, county, taxRate: tax.rate, taxJurisdiction: tax.jurisdiction, source: "US Census" }
}

function photonSuggestion(feature: PhotonFeature): LocationSuggestion | null {
  const properties = feature.properties || {}
  const longitude = coordinate(feature.geometry?.coordinates?.[0])
  const latitude = coordinate(feature.geometry?.coordinates?.[1])
  if (latitude === null || longitude === null) return null
  const name = text(properties.name)
  const houseNumber = text(properties.housenumber)
  const street = text(properties.street) || (text(properties.type) === "street" ? name : "")
  const city = text(properties.city) || text(properties.town) || text(properties.village)
  const state = text(properties.statecode).toUpperCase() || ({ "New York": "NY", "New Jersey": "NJ" }[text(properties.state)] || text(properties.state))
  const postalCode = text(properties.postcode)
  const county = text(properties.county)
  const address = [houseNumber && street ? `${houseNumber} ${street}` : street || name, city, state, postalCode].filter(Boolean).join(", ")
  if (!address) return null
  const tax = recommendedSalesTax(state, county)
  return { label: address, name: street && name !== street ? name : "", latitude, longitude, city, state, postalCode, county, taxRate: tax.rate, taxJurisdiction: tax.jurisdiction, source: "OpenStreetMap" }
}

async function fetchJson(url: URL) {
  const response = await fetch(url, {
    headers: { "User-Agent": "AvantiaBuild/1.0 (office@build.avantiap.com)" },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) return null
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>
}

export async function searchLocations(query: string, mode: "address" | "store") {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 160)
  if (normalized.length < 3) return []

  const photonUrl = new URL("https://photon.komoot.io/api/")
  photonUrl.searchParams.set("q", normalized)
  photonUrl.searchParams.set("limit", "6")
  photonUrl.searchParams.set("lang", "en")

  const censusUrl = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress")
  censusUrl.searchParams.set("address", normalized)
  censusUrl.searchParams.set("benchmark", "Public_AR_Current")
  censusUrl.searchParams.set("vintage", "Current_Current")
  censusUrl.searchParams.set("format", "json")

  const [photon, census] = await Promise.all([
    fetchJson(photonUrl).catch(() => null),
    mode === "address" && /\d/.test(normalized) ? fetchJson(censusUrl).catch(() => null) : Promise.resolve(null),
  ])
  const censusMatches = ((census?.result as { addressMatches?: CensusMatch[] } | undefined)?.addressMatches || []).map(censusSuggestion)
  const photonMatches = ((photon?.features as PhotonFeature[] | undefined) || []).map(photonSuggestion)
  const unique = new Map<string, LocationSuggestion>()
  for (const suggestion of [...censusMatches, ...photonMatches]) {
    if (!suggestion) continue
    const key = suggestion.label.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!unique.has(key)) unique.set(key, suggestion)
  }
  return [...unique.values()].slice(0, 6)
}

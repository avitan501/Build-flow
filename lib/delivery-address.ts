import type { DeliveryLocation } from "@/lib/location-types"

export function locationFromCoordinates(address: string, coordinates: string): DeliveryLocation | null {
  const [latitudeText, longitudeText] = coordinates.split(",").map((value) => value.trim())
  const latitude = Number(latitudeText)
  const longitude = Number(longitudeText)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const match = address.trim().match(/^(.+?),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)
  if (!match) return null
  return {
    label: address.trim(),
    name: "",
    latitude,
    longitude,
    city: match[2].trim(),
    state: match[3].toUpperCase(),
    postalCode: match[4],
  }
}

export function structuredLocation(location: DeliveryLocation | null, fallbackAddress: string) {
  if (!location?.state || !location.postalCode) return null
  const suffix = new RegExp(`,\\s*${location.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\s*${location.state}\\s+${location.postalCode}.*$`, "i")
  const street = fallbackAddress.trim().replace(suffix, "").trim()
  if (!street) return null
  return {
    addressLine1: street,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    country: "US",
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name || undefined,
  }
}

export function uberAddress(location: DeliveryLocation | null, fallbackAddress: string) {
  const value = structuredLocation(location, fallbackAddress)
  if (!value) return fallbackAddress.trim()
  return JSON.stringify({
    street_address: [value.addressLine1],
    city: value.city,
    state: value.state,
    zip_code: value.postalCode,
    country: value.country,
  })
}

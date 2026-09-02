import {
  captureOperationalError,
  shouldCaptureOperationalStatus,
} from "@/lib/monitoring/capture-operational-error"

type NominatimAddress = {
  house_number?: string
  road?: string
  pedestrian?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  state?: string
  postcode?: string
}

type NominatimResponse = {
  display_name?: string
  address?: NominatimAddress
}

function parseCoordinate(value: string | null, minimum: number, maximum: number) {
  if (!value) return null

  const coordinate = Number(value)
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum ? coordinate : null
}

function buildStreetAddress(result: NominatimResponse) {
  const address = result.address
  if (!address) return result.display_name?.trim() || null

  const street = [address.house_number, address.road || address.pedestrian].filter(Boolean).join(" ")
  const city = address.city || address.town || address.village || address.municipality
  const locality = [city, address.state, address.postcode].filter(Boolean).join(", ")
  const formatted = [street, locality].filter(Boolean).join(", ")

  return formatted || result.display_name?.trim() || null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latitude = parseCoordinate(searchParams.get("latitude"), -90, 90)
  const longitude = parseCoordinate(searchParams.get("longitude"), -180, 180)

  if (latitude === null || longitude === null) {
    return Response.json({ error: "A valid location is required." }, { status: 400 })
  }

  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse")
  endpoint.searchParams.set("format", "jsonv2")
  endpoint.searchParams.set("lat", String(latitude))
  endpoint.searchParams.set("lon", String(longitude))
  endpoint.searchParams.set("zoom", "18")
  endpoint.searchParams.set("addressdetails", "1")

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "AvantiaBuild/1.0 (https://avantiap.com)",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      if (shouldCaptureOperationalStatus(response.status)) {
        await captureOperationalError(new Error("Address provider returned a server failure."), {
          feature: "location",
          operation: "reverse-geocode",
          provider: "openstreetmap",
          safeCode: `address-provider-${response.status}`,
        })
      }
      return Response.json({ error: "The address service is temporarily unavailable." }, { status: 502 })
    }

    const result = (await response.json()) as NominatimResponse
    const address = buildStreetAddress(result)

    if (!address) {
      return Response.json({ error: "No street address was found for this location." }, { status: 404 })
    }

    return Response.json({ address })
  } catch (error) {
    await captureOperationalError(error, {
      feature: "location",
      operation: "reverse-geocode",
      provider: "openstreetmap",
      safeCode: "address-provider-unreachable",
    })
    return Response.json({ error: "The address service could not be reached." }, { status: 502 })
  }
}

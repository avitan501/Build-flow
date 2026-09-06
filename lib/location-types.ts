export type LocationSuggestion = {
  label: string
  name: string
  latitude: number
  longitude: number
  city: string
  state: string
  postalCode: string
  county: string
  taxRate: number | null
  taxJurisdiction: string
  source: "US Census" | "OpenStreetMap"
}

export type DeliveryLocation = Pick<
  LocationSuggestion,
  "label" | "name" | "latitude" | "longitude" | "city" | "state" | "postalCode"
>

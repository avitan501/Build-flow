export type DeliveryVehicle = "small" | "car" | "pickup" | "van"
export type DeliverySpeed = "flexible" | "same-day" | "rush"

export type Coordinate = {
  latitude: number
  longitude: number
}

export type DeliveryEstimate = {
  straightLineMiles: number
  estimatedRoadMiles: number
  baseCharge: number
  mileageCharge: number
  priorityCharge: number
  serviceFee: number
  total: number
}

export const DELIVERY_VEHICLES: Record<
  DeliveryVehicle,
  { label: string; description: string; baseCharge: number; perMile: number; minimum: number }
> = {
  small: {
    label: "Small item",
    description: "A fitting, tool, box, or emergency part",
    baseCharge: 8.99,
    perMile: 1.15,
    minimum: 10,
  },
  car: {
    label: "Car load",
    description: "Several boxes or supplies that fit in a trunk",
    baseCharge: 14,
    perMile: 1.65,
    minimum: 18,
  },
  pickup: {
    label: "Pickup truck",
    description: "Longer or larger materials needing an open bed",
    baseCharge: 29,
    perMile: 2.35,
    minimum: 35,
  },
  van: {
    label: "Cargo van",
    description: "Protected space for a larger material order",
    baseCharge: 44,
    perMile: 2.85,
    minimum: 55,
  },
}

export const DELIVERY_SPEEDS: Record<
  DeliverySpeed,
  { label: string; description: string; multiplier: number; eta: string }
> = {
  flexible: {
    label: "Flexible",
    description: "Best price",
    multiplier: 1,
    eta: "2–4 hr pickup",
  },
  "same-day": {
    label: "Same day",
    description: "Today",
    multiplier: 1.15,
    eta: "1–2 hr pickup",
  },
  rush: {
    label: "Rush",
    description: "Emergency",
    multiplier: 1.35,
    eta: "30–60 min pickup",
  },
}

const EARTH_RADIUS_MILES = 3958.8
const ESTIMATED_ROAD_FACTOR = 1.18

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function isValidCoordinate(coordinate: Coordinate | null): coordinate is Coordinate {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude) &&
      coordinate.latitude >= -90 &&
      coordinate.latitude <= 90 &&
      coordinate.longitude >= -180 &&
      coordinate.longitude <= 180,
  )
}

export function parseCoordinatePair(value: string): Coordinate | null {
  const normalized = value
    .trim()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
  const parts = normalized.includes(",") ? normalized.split(",") : normalized.split(" ")

  if (parts.length !== 2) return null

  const latitude = Number(parts[0].trim())
  const longitude = Number(parts[1].trim())
  const coordinate = { latitude, longitude }

  return isValidCoordinate(coordinate) ? coordinate : null
}

export function calculateStraightLineMiles(origin: Coordinate, destination: Coordinate) {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude)
  const longitudeDelta = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine))
}

export function calculateDeliveryEstimate({
  origin,
  destination,
  vehicle,
  speed,
}: {
  origin: Coordinate
  destination: Coordinate
  vehicle: DeliveryVehicle
  speed: DeliverySpeed
}): DeliveryEstimate {
  const vehiclePricing = DELIVERY_VEHICLES[vehicle]
  const speedPricing = DELIVERY_SPEEDS[speed]
  const straightLineMiles = calculateStraightLineMiles(origin, destination)
  const estimatedRoadMiles = Math.max(0.5, straightLineMiles * ESTIMATED_ROAD_FACTOR)
  const baseCharge = vehiclePricing.baseCharge
  const mileageCharge = estimatedRoadMiles * vehiclePricing.perMile
  const transportSubtotal = Math.max(vehiclePricing.minimum, baseCharge + mileageCharge)
  const priorityCharge = transportSubtotal * (speedPricing.multiplier - 1)
  const serviceFee = Math.max(3.5, (transportSubtotal + priorityCharge) * 0.08)
  const total = transportSubtotal + priorityCharge + serviceFee

  return {
    straightLineMiles: Math.round(straightLineMiles * 10) / 10,
    estimatedRoadMiles: Math.round(estimatedRoadMiles * 10) / 10,
    baseCharge: roundCurrency(baseCharge),
    mileageCharge: roundCurrency(Math.max(0, transportSubtotal - baseCharge)),
    priorityCharge: roundCurrency(priorityCharge),
    serviceFee: roundCurrency(serviceFee),
    total: roundCurrency(total),
  }
}

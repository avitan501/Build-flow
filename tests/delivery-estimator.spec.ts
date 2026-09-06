import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { calculateDeliveryEstimate, parseCoordinatePair } from "../lib/delivery-pricing"
import { structuredLocation, uberAddress } from "../lib/delivery-address"

const root = process.cwd()

test("delivery planning math remains deterministic and itemized", () => {
  const origin = parseCoordinatePair("40.741895, -73.989308")
  const destination = parseCoordinatePair("40.678178, -73.944158")
  expect(origin).not.toBeNull()
  expect(destination).not.toBeNull()
  const estimate = calculateDeliveryEstimate({ origin: origin!, destination: destination!, vehicle: "small", speed: "rush" })
  expect(estimate.estimatedRoadMiles).toBeGreaterThan(0)
  expect(estimate.total).toBeGreaterThan(estimate.serviceFee)
  expect(estimate.mileageCharge).toBeGreaterThanOrEqual(0)
})

test("provider addresses stay structured and consistent between quote and booking", () => {
  const location = { label: "20 W 34th St, New York, NY 10001", name: "Store", latitude: 40.74868, longitude: -73.98561, city: "New York", state: "NY", postalCode: "10001" }
  expect(structuredLocation(location, location.label)).toEqual({ addressLine1: "20 W 34th St", city: "New York", state: "NY", postalCode: "10001", country: "US", latitude: 40.74868, longitude: -73.98561, name: "Store" })
  expect(JSON.parse(uberAddress(location, location.label))).toEqual({ street_address: ["20 W 34th St"], city: "New York", state: "NY", zip_code: "10001", country: "US" })
})

test("jobsite delivery remains a protected Manager-only internal route", async () => {
  const [header, shopNavigation, aiTools, managerDashboard, page, actions, estimator, autocomplete, locationApi, quoteApi, scheduleApi, uberDirect, curriQuoteApi, curriScheduleApi, curri, migration] = await Promise.all([
    readFile(path.join(root, "components/buildflow/mobile-client-header.tsx"), "utf8"),
    readFile(path.join(root, "lib/shop-navigation.ts"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/jobsite-delivery/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/jobsite-delivery/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/delivery-estimator.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/location-autocomplete.tsx"), "utf8"),
    readFile(path.join(root, "app/api/location/search/route.ts"), "utf8"),
    readFile(path.join(root, "app/api/delivery/uber/quote/route.ts"), "utf8"),
    readFile(path.join(root, "app/api/delivery/uber/schedule/route.ts"), "utf8"),
    readFile(path.join(root, "lib/uber-direct.ts"), "utf8"),
    readFile(path.join(root, "app/api/delivery/curri/quote/route.ts"), "utf8"),
    readFile(path.join(root, "app/api/delivery/curri/schedule/route.ts"), "utf8"),
    readFile(path.join(root, "lib/curri.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260906125013_add_service_only_curri_credentials_reader.sql"), "utf8"),
  ])
  expect(header).not.toContain('href: "/delivery"')
  expect(shopNavigation).not.toContain('label: "Jobsite Delivery"')
  expect(aiTools).not.toContain('href: "/admin/ai-tools/jobsite-delivery"')
  expect(managerDashboard).not.toContain('label: "Jobsite Delivery"')
  expect(page).toContain("requireManagerPortalProfile")
  expect(page).toContain("loadDeliveryRequests(supabase)")
  expect(page).not.toContain("createAdminClient")
  expect(actions).toContain("requireManagerPortalProfile")
  expect(actions).toContain('status: z.enum(["new", "quoted", "dispatched", "completed", "cancelled"])')
  expect(actions).toContain('pickupCoordinates: z.string().trim().max(100)')
  expect(actions).toContain('jobsiteCoordinates: z.string().trim().max(100)')
  expect(estimator).toContain('url: "/api/delivery/uber/quote"')
  expect(estimator).toContain('url: "/api/delivery/curri/quote"')
  expect(estimator).toContain("Saved to the Manager delivery queue.")
  expect(estimator).toContain("LocationAutocomplete")
  expect(estimator).toContain("Open store search in Maps")
  expect(estimator).toContain("Number of items / packages")
  expect(estimator).toContain("Weight of each item (lb)")
  expect(estimator).toContain("Compare Uber Direct and Curri")
  expect(estimator).toContain("Compare live prices")
  expect(estimator).toContain("Driver loading and unloading required")
  expect(estimator).toContain('disabled={liveQuoteState === "loading"}')
  expect(autocomplete).toContain('/api/location/search?q=')
  expect(autocomplete).toContain('aria-autocomplete="list"')
  expect(locationApi).toContain("searchLocations")
  expect(locationApi).toContain("managerCapabilities")
  expect(estimator).toContain("Approve and book")
  expect(estimator).toContain("Booking can create a provider charge")
  expect(quoteApi).toContain("managerCapabilities")
  expect(quoteApi).toContain("access.aiTools")
  expect(scheduleApi).toContain("managerCapabilities")
  expect(scheduleApi).toContain('confirmed: z.literal(true)')
  expect(scheduleApi).toContain("createUberDirectDelivery")
  expect(scheduleApi).toContain("already has a provider delivery")
  expect(quoteApi).toContain("quoteUberDirect")
  expect(quoteApi).toContain('vehicle: z.enum(["small", "car", "pickup", "van"])')
  expect(actions).toContain("packageQuantity: z.number().int().positive().max(100)")
  expect(actions).toContain("weightPerPackage: z.number().positive().max(5000)")
  expect(uberDirect).toContain('get_uber_direct_credentials')
  expect(uberDirect).toContain('/delivery_quotes`')
  expect(uberDirect).toContain('/deliveries`')
  expect(uberDirect).toContain("quantity: input.packageQuantity")
  expect(uberDirect).toContain("weight: Math.round(input.weightPerPackage * 453.592)")
  expect(uberDirect).toContain("address_undeliverable")
  expect(curriQuoteApi).toContain("managerCapabilities")
  expect(curriQuoteApi).toContain("quoteCurri")
  expect(curriScheduleApi).toContain('confirmed: z.literal(true)')
  expect(curriScheduleApi).toContain("delivery_booking_locks")
  expect(curri).toContain("https://api.curri.com/graphql")
  expect(curri).toContain("accessorialFees")
  expect(curri).toContain("tollFees")
  expect(migration).toContain("get_curri_credentials")
  expect(migration).toContain("enable row level security")
})

test("legacy public delivery URL forwards into the protected Manager tool", async ({ page }) => {
  await page.goto("/delivery")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fai-tools%2Fjobsite-delivery/)
})

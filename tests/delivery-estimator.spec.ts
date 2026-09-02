import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { calculateDeliveryEstimate, parseCoordinatePair } from "../lib/delivery-pricing"

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

test("jobsite delivery remains a protected Manager-only internal route", async () => {
  const [header, shopNavigation, aiTools, managerDashboard, page, actions, estimator, autocomplete, locationApi, quoteApi, scheduleApi, uberDirect, quoteFunction] = await Promise.all([
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
    readFile(path.join(root, "supabase/functions/uber-direct-quote/index.ts"), "utf8"),
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
  expect(estimator).toContain('fetch("/api/delivery/uber/quote"')
  expect(estimator).toContain("Saved to the Manager delivery queue.")
  expect(estimator).toContain("LocationAutocomplete")
  expect(estimator).toContain("Open store search in Maps")
  expect(estimator).toContain("address_undeliverable")
  expect(estimator).toContain("Number of boxes")
  expect(estimator).toContain("Weight of each box (lb)")
  expect(estimator).toContain("The 50 lb limit applies to each box—not all boxes combined.")
  expect(estimator).toContain("live Uber route fee")
  expect(estimator).toContain("Uber Direct answered, but does not serve this exact route")
  expect(estimator).toContain("Live now")
  expect(estimator).toContain("Uber quote")
  expect(estimator).toContain('disabled={liveQuoteState === "loading"}')
  expect(autocomplete).toContain('/api/location/search?q=')
  expect(autocomplete).toContain('aria-autocomplete="list"')
  expect(locationApi).toContain("searchLocations")
  expect(locationApi).toContain("managerCapabilities")
  expect(estimator).toContain("Schedule Uber delivery")
  expect(estimator).toContain("Scheduling can create a charge with Uber Direct")
  expect(quoteApi).toContain("managerCapabilities")
  expect(quoteApi).toContain("access.aiTools")
  expect(scheduleApi).toContain("managerCapabilities")
  expect(scheduleApi).toContain('confirmed: z.literal(true)')
  expect(scheduleApi).toContain("createUberDirectDelivery")
  expect(scheduleApi).toContain("already has an Uber delivery")
  expect(quoteApi).toContain('functions.invoke<')
  expect(quoteApi).toContain('("uber-direct-quote"')
  expect(quoteApi).toContain('vehicle: z.enum(["small", "car", "pickup", "van"])')
  expect(actions).toContain("packageQuantity: z.number().int().positive().max(20)")
  expect(actions).toContain("weightPerPackage: z.number().positive().max(50)")
  expect(uberDirect).toContain('get_uber_direct_credentials')
  expect(uberDirect).toContain('/delivery_quotes`')
  expect(uberDirect).toContain('/deliveries`')
  expect(uberDirect).toContain("quantity: input.packageQuantity")
  expect(uberDirect).toContain("weight: Math.round(input.weightPerPackage * 453.592)")
  expect(uberDirect).toContain("address_undeliverable")
  expect(quoteFunction).toContain("managerAuthorized")
  expect(quoteFunction).toContain('code: "manager_access_required"')
})

test("legacy public delivery URL forwards into the protected Manager tool", async ({ page }) => {
  await page.goto("/delivery")
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fai-tools%2Fjobsite-delivery/)
})

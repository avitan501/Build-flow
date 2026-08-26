import { expect, test } from "@playwright/test"

test.describe("delivery estimator", () => {
  test("calculates an itemized price and saves the request", async ({ page }) => {
    await page.goto("/delivery")
    await page.getByRole("button", { name: /Flexible/ }).click()
    await expect(page.getByRole("button", { name: /Flexible/ })).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: /Rush Emergency/ }).click()

    await page.getByLabel("Store name").fill("Home Depot Manhattan")
    await page.getByLabel("Pickup coordinates").fill("40.741895, -73.989308")
    await page.getByLabel("Jobsite coordinates").fill("40.678178, -73.944158")

    await expect(page.getByText("Road distance estimate")).toBeVisible()
    await expect(page.getByText("Base · Small item")).toBeVisible()
    await expect(page.getByText("Rush priority")).toBeVisible()
    await expect(page.getByText("Coordination fee")).toBeVisible()
    await expect(page.getByText("Estimated total")).toBeVisible()

    await page.getByRole("button", { name: "Save delivery request" }).click()
    await expect(page.getByRole("status")).toContainText("DLV-")

    const savedRequests = await page.evaluate(() => window.localStorage.getItem("buildflow-delivery-requests"))
    expect(savedRequests).toContain("Home Depot Manhattan")
  })

  test("shows a clear coordinate validation message", async ({ page }) => {
    await page.goto("/delivery")
    await page.getByRole("button", { name: /Flexible/ }).click()
    await expect(page.getByRole("button", { name: /Flexible/ })).toHaveAttribute("aria-pressed", "true")
    await page.getByLabel("Pickup coordinates").fill("not a coordinate")
    await expect(page.getByText("Use: latitude, longitude")).toBeVisible()
  })

  test("shows an Uber Direct live quote without creating a delivery", async ({ page }) => {
    await page.route("**/api/delivery/uber/quote", async (route) => {
      expect(route.request().method()).toBe("POST")
      const body = route.request().postDataJSON()
      expect(body).toMatchObject({
        pickupAddress: "230 Sheridan Blvd, Inwood, NY 11096",
        dropoffAddress: "28 Woodmere Blvd S, Woodmere, NY 11598",
        weightPounds: 20,
        vehicle: "small",
      })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          provider: "Uber Direct",
          quote: {
            quoteId: "dqt_test_quote",
            total: 14.72,
            currency: "USD",
            durationMinutes: 24,
            pickupMinutes: 8,
            dropoffEta: "2026-08-26T14:00:00Z",
            expiresAt: "2026-08-26T13:45:00Z",
          },
        }),
      })
    })

    await page.goto("/delivery", { waitUntil: "networkidle" })
    await page.getByLabel("Pickup address").fill("230 Sheridan Blvd, Inwood, NY 11096")
    await page.getByLabel("Jobsite address").fill("28 Woodmere Blvd S, Woodmere, NY 11598")
    await page.getByLabel("Package weight (lb)").fill("20")
    await expect(page.getByLabel("Pickup address")).toHaveValue("230 Sheridan Blvd, Inwood, NY 11096")
    await expect(page.getByLabel("Jobsite address")).toHaveValue("28 Woodmere Blvd S, Woodmere, NY 11598")
    await page.getByRole("button", { name: "Get live Uber price" }).click()

    await expect(page.getByText("$14.72 live provider fee")).toBeVisible()
    await expect(page.getByText("Uber Direct production quote")).toBeVisible()
    await expect(page.getByText("No AvantiaBuild markup", { exact: true })).toBeVisible()
  })
})

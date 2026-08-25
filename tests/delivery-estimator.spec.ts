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
})

import { expect, test } from "@playwright/test"

test("publishes crawler rules and protects private areas", async ({ request }) => {
  const response = await request.get("/robots.txt")

  expect(response.ok()).toBeTruthy()
  const robots = await response.text()
  expect(robots).toContain("Allow: /")
  expect(robots).toContain("Disallow: /admin/")
  expect(robots).toContain("Disallow: /owner/")
  expect(robots).toContain("Disallow: /api/")
  expect(robots).toContain("Sitemap: https://build.avantiap.com/sitemap.xml")
})

test("publishes only customer-facing canonical pages in the sitemap", async ({ request }) => {
  const response = await request.get("/sitemap.xml")

  expect(response.ok()).toBeTruthy()
  const sitemap = await response.text()
  expect(sitemap).toContain("<loc>https://build.avantiap.com</loc>")
  expect(sitemap).toContain("<loc>https://build.avantiap.com/shop</loc>")
  expect(sitemap).toContain("<loc>https://build.avantiap.com/beat-a-quote</loc>")
  expect(sitemap).not.toContain("/admin/")
  expect(sitemap).not.toContain("/owner/")
  expect(sitemap).not.toContain("/projects/")
  expect(sitemap).not.toContain("/api/")
})

test("identifies Avantia Build to search engines", async ({ page }) => {
  await page.goto("/")

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://build.avantiap.com")
  const schema = await page.locator('script[type="application/ld+json"]').textContent()
  expect(schema).toContain('"name":"Avantia Build"')
  expect(schema).toContain('"telephone":"+1-516-908-8319"')
  expect(schema).toContain('"name":"New York"')
})

test("marks manager pages as unavailable for indexing", async ({ request }) => {
  const response = await request.get("/admin/build-map", { maxRedirects: 0 })

  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow")
})

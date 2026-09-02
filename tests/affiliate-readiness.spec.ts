import { expect, test } from "@playwright/test"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const disclosure =
  "AvantiaBuild may earn a commission if you purchase through a retailer link on this page, at no additional cost to you."

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.filter((entry) => ![".git", ".next", "node_modules"].includes(entry.name)).map(async (entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(target) : [target]
  }))
  return nested.flat()
}

test("affiliate disclosure is public, plain-language, and linked from the footer", async ({ page }) => {
  await page.goto("/affiliate-disclosure")

  await expect(page.getByRole("heading", { level: 1, name: "Affiliate Disclosure" })).toBeVisible()
  await expect(page.getByText(disclosure, { exact: false })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Retailer independence" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Affiliate Disclosure" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test("material selection process explains audience, comparisons, and compensation independence", async ({ page }) => {
  await page.goto("/how-we-select-materials")

  await expect(page.getByRole("heading", { level: 1, name: "How We Select Materials" })).toBeVisible()
  await expect(page.getByText(/contractors, builders, property owners, and project teams/i)).toBeVisible()
  await expect(page.getByText(/Compensation does not determine factual claims/i)).toBeVisible()
  await expect(page.getByRole("link", { name: "How We Select Materials" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test("commissionable link surfaces use the reusable nearby disclosure", async () => {
  const component = await readFile(path.join(root, "components/buildflow/affiliate-disclosure.tsx"), "utf8")
  const priceCheck = await readFile(path.join(root, "components/buildflow/material-price-check.tsx"), "utf8")
  const catalog = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")
  const tracker = await readFile(path.join(root, "components/buildflow/affiliate-program-tracker.tsx"), "utf8")
  const amazon = await readFile(path.join(root, "app/admin/ai-tools/construction-amazon-deals/page.tsx"), "utf8")

  expect(component).toContain('data-testid="affiliate-disclosure"')
  expect(component).toContain("AFFILIATE_DISCLOSURE")
  expect(priceCheck.match(/<AffiliateDisclosure/g)?.length).toBeGreaterThanOrEqual(2)
  expect(catalog).toContain('<AffiliateDisclosure className="mt-2" />')
  expect(tracker).toContain("program.affiliate_test_url ? <AffiliateDisclosure")
  expect(amazon).toContain("program.affiliate_test_url ? <AffiliateDisclosure")
})

test("retailer links are direct, accurately identified, and accessible", async () => {
  const catalogLinks = await readFile(path.join(root, "lib/catalog-retailer-links.ts"), "utf8")
  const searchLinks = await readFile(path.join(root, "lib/exa-catalog-search.ts"), "utf8")
  const priceCheck = await readFile(path.join(root, "components/buildflow/material-price-check.tsx"), "utf8")
  const catalog = await readFile(path.join(root, "components/buildflow/material-catalog-workspace.tsx"), "utf8")

  for (const source of [catalogLinks, searchLinks]) {
    expect(source).toContain('"The Home Depot"')
    expect(source).toContain("https://www.homedepot.com/s/")
    expect(source).not.toMatch(/homedepot\.com[^\s`"']*(?:irclickid|impact|utm_|cm_mmc|affiliate|ref_)=/i)
  }
  expect(priceCheck).toContain("Direct retailer searches")
  expect(priceCheck).toContain("aria-label={`Search ${link.label} for ${itemQuery} (opens in a new tab)`}")
  expect(catalog).toContain("direct retailer search links")
  expect(catalog).not.toContain("official product searches")
})

test("the release adds no Home Depot logo or approval claim", async () => {
  const publicFiles = await filesBelow(path.join(root, "public"))
  const homeDepotAssets = publicFiles.filter((file) => /home[-_ ]?depot/i.test(path.basename(file)))
  expect(homeDepotAssets).toEqual([])

  const checkedFiles = (await filesBelow(root)).filter((file) =>
    /\.(?:ts|tsx)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}.next${path.sep}`),
  )
  const sources = await Promise.all(checkedFiles.map((file) => readFile(file, "utf8")))
  const source = sources.join("\n")
  expect(source).not.toMatch(/AvantiaBuild (?:is|has been) (?:an? )?(?:approved|authorized|official) (?:Home Depot|The Home Depot) (?:affiliate|partner)/i)
})

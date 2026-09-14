import { expect, test } from "@playwright/test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { RequestFulfillmentOverview } from "@/components/buildflow/request-fulfillment-overview"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const serverExports = {} as { RequestFulfillmentOverview: typeof RequestFulfillmentOverview }
const source = ts.transpileModule(readFileSync("components/buildflow/request-fulfillment-overview.tsx", "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
new Function("exports", "require", source)(serverExports, createRequire(`${process.cwd()}/package.json`))

const base = {
  phase: 0, done: [false, false, false, false, false], status: "Finish supplier pricing first", document: null,
  primaryAction: createElement("button", null, "Continue supplier pricing"),
  priceBreakdown: "No saved client prices yet.", paymentDetails: "Payment pending", deliveryDetails: "Scheduling does not confirm delivery.", deliveryLabel: "Not scheduled",
}
test("empty request has no invented document, amount, or completed delivery", () => {
  const html = renderToStaticMarkup(createElement(serverExports.RequestFulfillmentOverview, base))
  expect(html).not.toContain("$1,250")
  expect(html).not.toContain("Updated")
  expect(html).toContain("Finish supplier pricing first")
  expect(html).toContain("Scheduling does not confirm delivery.")
  expect(html.match(/<details/g)).toHaveLength(3)
  expect(html).not.toContain("<details open")
})
test("saved card displays its real total and updated time, not invented sent state", () => {
  const html = renderToStaticMarkup(createElement(serverExports.RequestFulfillmentOverview, { ...base, document: { label: "Estimate", number: "FIXTURE-1", total: 321.25, updated: "Sep 14, 10:00 AM ET", href: "/fixture-document" } }))
  expect(html).toContain("$321.25")
  expect(html).toContain("Updated Sep 14")
  expect(html).not.toContain("Sent Sep 14")
  expect(html).toContain('href="/fixture-document"')
})

for (const width of [390, 1440]) test(`compact fulfillment details are accessible and fit ${width}px`, async ({ page }) => {
  const css = readdirSync(".next/static/css").filter(name => name.endsWith(".css")).map(name => readFileSync(`.next/static/css/${name}`, "utf8")).join("\n")
  const html = renderToStaticMarkup(createElement(serverExports.RequestFulfillmentOverview, { ...base, document: { label: "Estimate", number: "FIXTURE-1", total: 321.25, updated: "Sep 14, 10:00 AM ET", href: "/fixture-document" } }))
  await page.setViewportSize({ width, height: 900 })
  await page.setContent(`<style>${css}</style><main style="max-width:1000px;margin:20px auto;padding:16px">${html}</main>`)
  await expect(page.getByRole("button", { name: "Continue supplier pricing" })).toBeVisible()
  await expect(page.getByText("Payment pending", { exact: true })).not.toBeVisible()
  await page.locator("summary").filter({ hasText: "Payment & receipt" }).click()
  await expect(page.getByText("Payment pending", { exact: true })).toBeVisible()
  await page.locator("summary").filter({ hasText: "Delivery details" }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Scheduling does not confirm delivery.", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/request-step3-compact-${width}.png`, fullPage: true })
})

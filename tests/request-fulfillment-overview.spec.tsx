import { expect, test } from "@playwright/test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { RequestFulfillmentOverview, SavedClientPriceTotals } from "@/components/buildflow/request-fulfillment-overview"
import { fulfillmentPhaseForAction, savedClientDocumentAmounts } from "../lib/request-fulfillment-presentation"
import {requestWorkflowState} from "../lib/request-workflow-state"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const serverExports = {} as { RequestFulfillmentOverview: typeof RequestFulfillmentOverview; SavedClientPriceTotals: typeof SavedClientPriceTotals }
const source = ts.transpileModule(readFileSync("components/buildflow/request-fulfillment-overview.tsx", "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
new Function("exports", "require", source)(serverExports, createRequire(`${process.cwd()}/package.json`))

const base = {
  phase: 0, done: [false, false, false, false, false], status: "Finish supplier pricing first", document: null,
  primaryAction: createElement("button", null, "Continue supplier pricing"),
  priceBreakdown: "No saved client prices yet.", paymentDetails: "Payment pending", deliveryDetails: "Scheduling does not confirm delivery.", deliveryLabel: "Not scheduled",
}
test('paid legacy history follows receipt/delivery action without inventing earlier completions',()=>{
 const input={routeSupplierCount:0,supplierRequestCount:0,supplierQuoteCount:0,winningSupplierSelected:false,estimateSent:false,clientApproved:false,invoiceSent:false,paymentLinkSent:false,paymentReceived:true,receiptSent:false,deliveryScheduled:false}
 const workflow=requestWorkflowState(input)
 expect(fulfillmentPhaseForAction(workflow.step3Action)).toBe(3)
 expect(fulfillmentPhaseForAction(requestWorkflowState({...input,receiptSent:true}).step3Action)).toBe(4)
 const html=renderToStaticMarkup(createElement(serverExports.RequestFulfillmentOverview,{...base,phase:3,done:[false,false,true,false,false]}))
 expect(html).toContain('Receipt: Current')
 expect(html).toContain('Estimate: Not recorded')
 expect(html).toContain('Approval: Not recorded')
 expect(html).not.toContain('Approval: Complete')
})
test('saved snapshot breakdown uses the same delivery and taxable-delivery arithmetic as headline',()=>{
 const saved={lines:[{quantity:2,unitPrice:50}],deliveryCharge:20,salesTaxRate:10,taxableDelivery:true}
 expect(savedClientDocumentAmounts(saved)).toEqual({subtotal:100,delivery:20,tax:12,taxRate:10,total:132})
 expect(savedClientDocumentAmounts({...saved,taxableDelivery:false}).total).toBe(130)
 const html=renderToStaticMarkup(createElement(serverExports.SavedClientPriceTotals,{amounts:savedClientDocumentAmounts(saved)}))
 for(const text of ['Subtotal','Delivery','Sales tax (10%)','Total','$100.00','$20.00','$12.00','$132.00'])expect(html).toContain(text)
 const source=readFileSync('components/buildflow/request-management-panel.tsx','utf8')
 expect(source).toContain('total: fulfillmentAmounts!.total')
 expect(source).toContain('<SavedClientPriceTotals amounts={fulfillmentAmounts}')
 expect(source).toContain('const fulfillmentDone = [estimateSent, clientApproved, paymentReceived, receiptSent, deliveryScheduled]')
})
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
  const amounts=savedClientDocumentAmounts({lines:[{quantity:2,unitPrice:50}],deliveryCharge:20,salesTaxRate:10,taxableDelivery:true})
  const html = renderToStaticMarkup(createElement(serverExports.RequestFulfillmentOverview, { ...base, paymentDetails:"Recorded payment details", phase:3, done:[false,false,true,false,false], status:"Next: Create receipt",primaryAction:createElement('button',null,'Create receipt'), priceBreakdown:createElement(serverExports.SavedClientPriceTotals,{amounts}),document: { label: "Invoice", number: "FIXTURE-1", total: amounts.total, updated: "Sep 14, 10:00 AM ET", href: "/fixture-document" } }))
  await page.setViewportSize({ width, height: 900 })
  await page.setContent(`<style>${css}</style><main style="max-width:1000px;margin:20px auto;padding:16px"><details class="group" open><summary>Step 3</summary>${html}</details></main>`)
  await expect(page.getByRole("button", { name: "Create receipt" })).toBeVisible()
  const priceArrow = page.locator('summary').filter({hasText:'Price breakdown'}).locator('svg').last()
  expect(await priceArrow.evaluate(element => getComputedStyle(element).rotate)).toBe("none")
  await page.locator('summary').filter({hasText:'Price breakdown'}).click()
  await expect.poll(() => priceArrow.evaluate(element => getComputedStyle(element).rotate)).toBe("180deg")
  await expect(page.getByText('$132.00',{exact:true})).toHaveCount(2)
  await expect(page.getByText('Sales tax (10%)',{exact:true})).toBeVisible()
  await expect(page.getByText("Recorded payment details", { exact: true })).not.toBeVisible()
  await page.locator("summary").filter({ hasText: "Payment & receipt" }).click()
  await expect(page.getByText("Recorded payment details", { exact: true })).toBeVisible()
  await page.locator("summary").filter({ hasText: "Delivery details" }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Scheduling does not confirm delivery.", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/request-step3-compact-${width}.png`, fullPage: true })
})

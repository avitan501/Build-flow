import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"
import ts from "typescript"
import { createRequire } from "node:module"

const source = () => readFile(path.join(process.cwd(), "components/buildflow/request-management-panel.tsx"), "utf8")

test("unorganized intake starts with future pricing closed and manual substeps stay in tools", async () => {
  const component = await source()
  expect(component).toContain('open={itemsReadyForPricing && pricingStatus === "active"}')
  const tools = component.slice(component.indexOf('</>} tools={<>'), component.indexOf('data-testid="request-step-2"'))
  expect(tools).toContain('<RequestSubstepFunnel')
  expect(tools.indexOf('<RequestSubstepFunnel')).toBeLessThan(tools.indexOf('</>} />'))
})

test("completed supplier pricing continues to existing client stage without creating an estimate", async () => {
  const component = await source()
  const completedAction = component.split("if (workflow.step2Complete) {")[1].split('if (workflow.step2Action === "choose-suppliers")')[0]
  expect(completedAction).toContain("onClick={continueToClientDelivery}")
  expect(completedAction).not.toContain("openDocument")
  const navigate = component.split("function continueToClientDelivery() {")[1].split("function renderStep2PrimaryAction()")[0]
  expect(navigate).toContain('document.getElementById("request-client-delivery")')
  expect(navigate).toContain("section.open = true")
  expect(navigate).toContain("section.focus({ preventScroll: true })")
  expect(navigate).toContain("prefers-reduced-motion: reduce")
  expect(navigate).not.toMatch(/Action\(|router\.|openDocument/)
})

test("workflow destinations are focusable and leave room for sticky navigation", async () => {
  const component = await source()
  for (const id of ["request-supplier-quotes", "request-client-delivery"]) {
    const section = component.split(`<details id="${id}"`)[1].split(">\n")[0]
    expect(section).toContain("tabIndex={-1}")
    expect(section).toContain("scroll-mt-24")
    expect(section).toContain("focus-visible:ring-2")
  }
})

test("upcoming client stage explains prerequisite and scheduled is not called delivered", async () => {
  const component = await source()
  expect(component).toContain('const waitingForSupplierPricing = paymentDeliveryStatus === "upcoming" && !hasClientProgress')
  expect(component).toContain('const fulfillmentDetail = waitingForSupplierPricing\n    ? "Finish supplier pricing first"')
  expect(component).toContain("Payment complete · Delivery scheduled")
  expect(component).not.toContain("Payment & Delivery Complete")
})

test("fresh upcoming Step 3 returns navigation instead of an estimate action", async () => {
  const component = await source()
  const action = component.slice(component.indexOf("function renderStep3PrimaryAction()"), component.indexOf("function continueToSupplierPricing()"))
  const compiled = ts.transpileModule(action, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  const navigate = () => {}
  const result = new Function("waitingForSupplierPricing", "continueToSupplierPricing", "primaryWorkflowClass", "Route", "require", "exports", `${compiled}; return renderStep3PrimaryAction();`)(true, navigate, "primary", "svg", createRequire(`${process.cwd()}/package.json`), {})
  expect(result.type).toBe("button")
  expect(result.props.onClick).toBe(navigate)
  expect(result.props.children).toContain("Continue supplier pricing")
  expect(result.props.disabled).toBeUndefined()
  expect(component).toContain('active: !waitingForSupplierPricing && ["send-estimate", "wait-for-approval"]')
  expect(component).toContain('Create direct estimate')
  expect(component).toContain('aria-label="Saved client documents"')
})

test("existing client documents or any fulfillment evidence preserve the current actions", async () => {
  const component = await source()
  const conditions = component.slice(component.indexOf("const clientDocuments ="), component.indexOf("const fulfillmentDetail ="))
  const keys = ["estimateSent", "clientApproved", "invoiceSent", "paymentLinkSent", "paymentReceived", "receiptSent", "deliveryScheduled"]
  const waiting = new Function("initialClientDocuments", "deletedDocumentTokens", "paymentDeliveryStatus", ...keys, `${conditions}; return waitingForSupplierPricing;`)
  expect(waiting([], [], "upcoming", ...keys.map(() => false))).toBe(true)
  expect(waiting([], [], "active", ...keys.map(() => false))).toBe(false)
  expect(waiting([{ publicToken: "saved" }], [], "upcoming", ...keys.map(() => false))).toBe(false)
  for (const key of keys) expect(waiting([], [], "upcoming", ...keys.map(entry => entry === key))).toBe(false)
})

test("continue supplier pricing opens and focuses Step 2 without any write", async () => {
  const component = await source()
  const body = component.split("function continueToSupplierPricing() {")[1].split("\n  }")[0]
  const events: string[] = []
  class Details {
    open = false
    focus(options: { preventScroll: boolean }) { expect(options.preventScroll).toBe(true); events.push("focus") }
    scrollIntoView(options: { behavior: string; block: string }) { expect(options).toEqual({ behavior: "instant", block: "start" }); events.push("scroll") }
  }
  const target = new Details()
  const run = new Function("document", "HTMLDetailsElement", "window", body)
  run({ getElementById: (id: string) => { expect(id).toBe("request-supplier-quotes"); return target } }, Details, { matchMedia: () => ({ matches: true }) })
  expect(target.open).toBe(true)
  expect(events).toEqual(["focus", "scroll"])
  expect(body).not.toMatch(/Action\(|router\.|openDocument/)
})

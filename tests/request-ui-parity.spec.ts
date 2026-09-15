import { test, expect } from "@playwright/test"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { requestStepDisplayStatus, type RequestStepState } from "../lib/request-step-state"
import type { RequestFulfillmentOverview } from "../components/buildflow/request-fulfillment-overview"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"
const component = {} as { RequestFulfillmentOverview: typeof RequestFulfillmentOverview }
new Function("exports", "require", ts.transpileModule(readFileSync("components/buildflow/request-fulfillment-overview.tsx", "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText)(component, createRequire(`${process.cwd()}/package.json`))

const steps = (completed: boolean[]): RequestStepState[] => completed.map((done, i) => ({ request_id: "test", step: (i + 1) as 1 | 2 | 3, assignee: "carlos", note: "", completed_override: null, revision: 0, eligible: done, completed: done }))
test("one status model covers current, future, waiting, completed and reopened steps", () => {
  expect([1, 2, 3].map(step => requestStepDisplayStatus(steps([false, false, false]), step as 1 | 2 | 3))).toEqual(["Action needed", "Not started", "Not started"])
  expect(requestStepDisplayStatus(steps([true, false, false]), 2, { step: 2, waiting: true })).toBe("Waiting")
  expect(requestStepDisplayStatus(steps([false, true, false]), 1, { step: 3, waiting: true })).toBe("Action needed")
  expect(requestStepDisplayStatus(steps([true, true, true]), 3)).toBe("Done")
})
test("empty fulfillment has one status and no repeated step title", () => {
  const html = renderToStaticMarkup(createElement(component.RequestFulfillmentOverview, { phase: 0, done: [false,false,false,false,false], status: "Finish supplier pricing first", document: null, primaryAction: "Continue supplier pricing", priceBreakdown: "Prices", paymentDetails: "Payment", deliveryDetails: "Delivery", deliveryLabel: "Not scheduled" }))
  expect(html.match(/Finish supplier pricing first/g)).toHaveLength(1)
  expect(html).not.toContain("Client &amp; delivery")
  expect(html).toContain("After approval")
  expect(html.match(/group-open\/fulfillment-detail:rotate-180/g)).toHaveLength(3)
})
test("approval sharing uses public saved link and keeps confirmed approval secondary", () => {
  const code = readFileSync("components/buildflow/request-management-panel.tsx", "utf8")
  const branch = code.slice(code.indexOf('if (workflow.step3Action === "wait-for-approval")'), code.indexOf('if (workflow.step3Action === "create-invoice")'))
  expect(branch).toContain("key={documentLinks.estimate} href={documentLinks.estimate}")
  expect(branch).not.toContain("markClientApproved")
  expect(code).toContain("Record confirmed approval")
  const share = readFileSync("components/buildflow/request-approval-link.tsx", "utf8")
  expect(share).toContain("await navigator.clipboard.writeText(href)")
  expect(share).toContain('aria-label="Approval link"')
  expect(share).not.toContain("/actions")
})

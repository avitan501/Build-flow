import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const source = () => readFile(path.join(process.cwd(), "components/buildflow/request-management-panel.tsx"), "utf8")

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
  expect(component).toContain('paymentDeliveryStatus === "upcoming"\n    ? "Finish supplier pricing first"')
  expect(component).toContain("Payment complete · Delivery scheduled")
  expect(component).not.toContain("Payment & Delivery Complete")
})

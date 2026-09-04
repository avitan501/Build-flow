import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { parseRequestClientDocument } from "../lib/request-client-document-data"
import {
  containsRawPaymentCredentialsInPayload,
  hasForbiddenPaymentFields,
  requestClientPaymentDocumentCopy,
  requestPaymentGuidanceForMethod,
  sanitizeRequestClientPayment,
} from "../lib/request-client-payment"

const root = process.cwd()

test("payment requests keep only safe method, amount, instructions, and hosted HTTPS URL", () => {
  expect(sanitizeRequestClientPayment({
    methods: ["credit_card", "ach"],
    amountDue: 1250.129,
    methodInstructions: {
      credit_card: "Please use the project reference shown above.",
      ach: "Call our office for secure ACH instructions.",
    },
    securePaymentUrl: "https://buy.stripe.com/existing-session",
  })).toEqual({
    ok: true,
    value: {
      methods: ["credit_card", "ach"],
      amountDue: 1250.13,
      methodInstructions: {
        credit_card: "Please use the project reference shown above.",
        ach: "Call our office for secure ACH instructions.",
      },
      securePaymentUrl: "https://buy.stripe.com/existing-session",
    },
  })
  expect(sanitizeRequestClientPayment({ method: "ach", amountDue: 725, instructions: "Call us." })).toEqual({
    ok: true,
    value: { methods: ["ach"], amountDue: 725, methodInstructions: { ach: "Call us." } },
  })
  expect(sanitizeRequestClientPayment({ method: "check", amountDue: 725, instructions: "" }).ok).toBe(true)
  expect(sanitizeRequestClientPayment({ methods: [], amountDue: 725, methodInstructions: {} })).toEqual({ ok: false, error: "Choose at least one payment option." })
})

test("payment requests reject raw card and bank credentials before persistence or rendering", () => {
  expect(hasForbiddenPaymentFields({ ach: { routingNumber: "021000021" } })).toBe(true)
  expect(hasForbiddenPaymentFields({ paymentRequest: { card_number: "4111111111111111" } })).toBe(true)
  expect(containsRawPaymentCredentialsInPayload({ terms: "Card 4111 1111 1111 1111" })).toBe(true)
  expect(containsRawPaymentCredentialsInPayload({ message: "CVV: 123" })).toBe(true)
  expect(containsRawPaymentCredentialsInPayload({ instructions: "Routing number 021000021" })).toBe(true)
  expect(sanitizeRequestClientPayment({ method: "credit_card", amountDue: 10, instructions: "Card 4111111111111111" }).ok).toBe(false)
  expect(sanitizeRequestClientPayment({ method: "ach", amountDue: 10, instructions: "", securePaymentUrl: "http://example.com/pay" }).ok).toBe(false)
  expect(sanitizeRequestClientPayment({ method: "credit_card", amountDue: 10, instructions: "", securePaymentUrl: "https://example.com/pay/4111111111111111" }).ok).toBe(false)
  expect(sanitizeRequestClientPayment({ method: "cash", amountDue: 10, instructions: "" }).ok).toBe(false)
  expect(sanitizeRequestClientPayment({ method: "check", amountDue: 0, instructions: "" }).ok).toBe(false)
})

test("manual payment methods say the client pays Avantia Build without inventing a provider", () => {
  expect(requestPaymentGuidanceForMethod("credit_card")).toContain("coordinate card payment")
  expect(requestPaymentGuidanceForMethod("ach")).toContain("Pay Avantia Build by ACH")
  expect(requestPaymentGuidanceForMethod("check")).toContain("payable to Avantia Build")
  expect(requestPaymentGuidanceForMethod("credit_card", "https://buy.stripe.com/existing-session")).toContain("Pay Avantia Build")
})

test("PDF and live-link payment copy comes only from saved manager selections", () => {
  const payment = {
    methods: ["credit_card", "ach"] as const,
    amountDue: 125,
    methodInstructions: { credit_card: "Call our office.", ach: "Ask for secure ACH instructions." },
    securePaymentUrl: "https://example.com/pay",
  }
  const invoice = requestClientPaymentDocumentCopy({ ...payment, methods: [...payment.methods] }, "invoice")
  expect(invoice.heading).toBe("How to pay Avantia Build")
  expect(invoice.amountLabel).toBe("Amount due to Avantia Build")
  expect(invoice.sections.map((section) => section.label)).toEqual(["Credit card", "ACH"])
  expect(invoice.sections.map((section) => section.instructions)).toEqual(["Call our office.", "Ask for secure ACH instructions."])
  expect(invoice.securePaymentUrl).toBe("https://example.com/pay")

  const receipt = requestClientPaymentDocumentCopy({ ...payment, methods: [...payment.methods] }, "receipt")
  expect(receipt.heading).toBe("Payment received by Avantia Build")
  expect(receipt.sections.every((section) => section.guidance === "")).toBe(true)
  expect(receipt.securePaymentUrl).toBeUndefined()
})

test("stored documents support explicit payment requests and safe legacy payment links", () => {
  const base = {
    document_type: "invoice" as const,
    document_number: "INV-100",
    version: 1,
    updated_at: "2026-09-03T12:00:00.000Z",
  }
  const commonDocumentData = {
    clientName: "Client",
    lines: [{ description: "Drywall", quantity: 2, unit: "sheet", unitPrice: 12.5 }],
    deliveryCharge: 0,
    salesTaxRate: 0,
  }
  const current = parseRequestClientDocument({
    ...base,
    document_data: {
      ...commonDocumentData,
      paymentRequest: { methods: ["ach", "check"], amountDue: 25, methodInstructions: { ach: "Call first.", check: "Payable to Avantia Build." } },
    },
  })
  expect(current?.paymentRequest).toEqual({ methods: ["ach", "check"], amountDue: 25, methodInstructions: { ach: "Call first.", check: "Payable to Avantia Build." } })

  const legacy = parseRequestClientDocument({
    ...base,
    document_data: {
      ...commonDocumentData,
      paymentLink: "https://buy.stripe.com/legacy-link",
      ach: { routingNumber: "021000021", accountNumber: "123456789" },
    },
  })
  expect(legacy?.paymentLink).toBe("https://buy.stripe.com/legacy-link")
  expect(legacy).not.toHaveProperty("ach")
})

test("client document UI and PDF use explicit payment requests without raw credential fields", async () => {
  const [panel, actions, pdf, livePage] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/request-client-quote-pdf.ts"), "utf8"),
    readFile(path.join(root, "app/client-document/[token]/page.tsx"), "utf8"),
  ])
  expect(panel).toContain("Request payment from client")
  expect(panel).toContain("Credit card / approved payment app")
  expect(panel).toContain("Payment options shown to the client")
  expect(panel).toContain("how to pay Avantia Build")
  expect(panel).toContain("setPaymentMethods")
  expect(panel).toContain("setPaymentInstructions")
  expect(panel).toContain("savedPaymentMethods")
  expect(panel).toContain("paymentOptionsInvalid")
  expect(panel).not.toContain("Include ACH payment information in this PDF")
  expect(panel).not.toContain("ach.routingNumber")
  expect(panel).not.toContain("ach.accountNumber")
  expect(actions).toContain("containsRawPaymentCredentialsInPayload(input)")
  expect(actions).toContain("sanitizeRequestClientPayment(input.paymentRequest)")
  expect(actions).not.toContain("input.ach")
  expect(pdf).toContain("requestClientPaymentDocumentCopy")
  expect(pdf).toContain("page.drawText(paymentCopy.heading")
  expect(pdf).toContain("paymentCopy.sections.flatMap")
  expect(pdf).toContain("Full payment instructions continue on the next page.")
  expect(pdf).toContain("fullPaymentLines.forEach")
  expect(pdf).not.toContain('page.drawText("ACH payment information"')
  expect(livePage).toContain("document.paymentRequest")
  expect(livePage).toContain("paymentCopy.heading")
  expect(livePage).toContain("paymentCopy.sections.map")
  expect(livePage).toContain("Call Avantia Build to coordinate payment")
  expect(livePage).not.toContain('row.document_type === "invoice" ? <a href={AVANTIA_PAYMENT_LINK}')
})

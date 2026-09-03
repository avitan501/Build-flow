import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import { parseRequestClientDocument } from "../lib/request-client-document-data"
import {
  containsRawPaymentCredentialsInPayload,
  hasForbiddenPaymentFields,
  requestPaymentGuidance,
  sanitizeRequestClientPayment,
} from "../lib/request-client-payment"

const root = process.cwd()

test("payment requests keep only safe method, amount, instructions, and hosted HTTPS URL", () => {
  expect(sanitizeRequestClientPayment({
    method: "credit_card",
    amountDue: 1250.129,
    instructions: "Please use the project reference shown above.",
    securePaymentUrl: "https://buy.stripe.com/existing-session",
  })).toEqual({
    ok: true,
    value: {
      method: "credit_card",
      amountDue: 1250.13,
      instructions: "Please use the project reference shown above.",
      securePaymentUrl: "https://buy.stripe.com/existing-session",
    },
  })
  expect(sanitizeRequestClientPayment({ method: "ach", amountDue: 725, instructions: "Call us." })).toEqual({
    ok: true,
    value: { method: "ach", amountDue: 725, instructions: "Call us." },
  })
  expect(sanitizeRequestClientPayment({ method: "check", amountDue: 725, instructions: "" }).ok).toBe(true)
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

test("manual payment methods give phone-safe guidance without inventing a provider", () => {
  expect(requestPaymentGuidance({ method: "credit_card" })).toContain("coordinate card payment")
  expect(requestPaymentGuidance({ method: "ach" })).toContain("coordinate secure ACH payment")
  expect(requestPaymentGuidance({ method: "check" })).toContain("coordinate check delivery")
  expect(requestPaymentGuidance({ method: "credit_card", securePaymentUrl: "https://buy.stripe.com/existing-session" })).toContain("secure hosted payment page")
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
      paymentRequest: { method: "ach", amountDue: 25, instructions: "Call first." },
    },
  })
  expect(current?.paymentRequest).toEqual({ method: "ach", amountDue: 25, instructions: "Call first." })

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
  expect(panel).toContain("Credit card")
  expect(panel).toContain("ACH")
  expect(panel).toContain("Check")
  expect(panel).not.toContain("Include ACH payment information in this PDF")
  expect(panel).not.toContain("ach.routingNumber")
  expect(panel).not.toContain("ach.accountNumber")
  expect(actions).toContain("containsRawPaymentCredentialsInPayload(input)")
  expect(actions).toContain("sanitizeRequestClientPayment(input.paymentRequest)")
  expect(actions).not.toContain("input.ach")
  expect(pdf).toContain('page.drawText("Payment request"')
  expect(pdf).not.toContain('page.drawText("ACH payment information"')
  expect(livePage).toContain("document.paymentRequest")
  expect(livePage).toContain("Coordinate payment by phone")
  expect(livePage).not.toContain('row.document_type === "invoice" ? <a href={AVANTIA_PAYMENT_LINK}')
})

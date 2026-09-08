import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { buildClientLinkMessage, canonicalClientLink, splitClientLinkMessage } from "../lib/client-link-message"

const root = process.cwd()
const newDocumentUrl = "https://avantiabuild.com/client-document/test-id"

test("document SMS uses real newlines and leaves the canonical URL alone on the final line", () => {
  const message = buildClientLinkMessage({
    messageText: "Please review your Avantia Build estimate. Reply with any questions or approval.",
    url: newDocumentUrl,
    fallbackMessage: "Your estimate is ready.",
  })

  expect(message).toBe(`Please review your Avantia Build estimate. Reply with any questions or approval.\n\n${newDocumentUrl}`)
  expect(message).not.toContain("\\n")
  expect(message.split("\n").at(-1)).toBe(newDocumentUrl)
  expect(message).not.toMatch(/\.$/)
})

test("escaped newlines and duplicate links are normalized before delivery", () => {
  const message = buildClientLinkMessage({
    messageText: `Please review this invoice.\\n\\n${newDocumentUrl}`,
    url: `${newDocumentUrl}.`,
    fallbackMessage: "Your invoice is ready.",
  })

  expect(message).toBe(`Please review this invoice.\n\n${newDocumentUrl}`)
  expect(message).not.toContain("\\n")
})

test("legacy and www Avantia links are rewritten to the primary domain", () => {
  expect(canonicalClientLink("https://build.avantiap.com/client-document/test-id"))
    .toBe(newDocumentUrl)
  expect(canonicalClientLink("https://www.avantiabuild.com/client-document/test-id?preview=1"))
    .toBe(`${newDocumentUrl}?preview=1`)
})

test("estimate invoice receipt and payment messages all preserve one standalone secure link", () => {
  for (const documentType of ["estimate", "invoice", "receipt"] as const) {
    const message = buildClientLinkMessage({
      messageText: `Please review your ${documentType}.`,
      url: newDocumentUrl,
      fallbackMessage: `Your ${documentType} is ready.`,
    })
    expect(splitClientLinkMessage(message)).toEqual({ text: `Please review your ${documentType}.`, url: newDocumentUrl })
  }

  const paymentUrl = "https://buy.stripe.com/5kQaEWb6q64N6FybJl97G00"
  expect(splitClientLinkMessage(buildClientLinkMessage({ messageText: "Pay securely below.", url: paymentUrl, fallbackMessage: "Payment link" })).url).toBe(paymentUrl)
})

test("client link validation rejects insecure and unapproved hosts", () => {
  expect(() => canonicalClientLink("http://avantiabuild.com/client-document/test-id")).toThrow()
  expect(() => canonicalClientLink("https://example.com/client-document/test-id")).toThrow()
})

test("every request document delivery path uses the shared builder and a review-before-send gate", async () => {
  const [panel, actions, auraAction] = await Promise.all([
    readFile(path.join(root, "components/buildflow/request-management-panel.tsx"), "utf8"),
    readFile(path.join(root, "app/owner/materials/requests/actions.ts"), "utf8"),
    readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8"),
  ])

  expect(panel).toContain("buildClientLinkMessage")
  expect(panel).toContain("Exact SMS preview · nothing sent yet")
  expect(panel).toContain("Send this exact text")
  expect(actions).toContain("buildClientLinkMessage")
  expect(actions).not.toContain("Open or download the latest version:")
  expect(auraAction).toContain('action: "send_sms"')
  expect(auraAction).toContain("message,")
})

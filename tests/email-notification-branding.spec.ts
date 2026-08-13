import { expect, test } from "@playwright/test"

import {
  renderCustomerEmailShell,
  renderRequestedItemsHtml,
  sendCartSubmissionEmail,
  sendManagerClientReplyEmail,
  sendProjectRequestNotificationEmail,
  sendQuoteIntakeEmail,
} from "@/lib/cart-submission-email"

type CapturedDelivery = { to: string[]; html: string; text: string }

async function captureEmailDeliveries(run: () => Promise<unknown>) {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.RESEND_API_KEY
  const deliveries: CapturedDelivery[] = []

  process.env.RESEND_API_KEY = "test-key"
  globalThis.fetch = async (_input, init) => {
    deliveries.push(JSON.parse(String(init?.body)) as CapturedDelivery)
    return new Response(JSON.stringify({ id: `email-${deliveries.length}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }

  try {
    await run()
    return deliveries
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalApiKey
  }
}

test("customer email chrome includes the animated logo and every company contact method", () => {
  const html = renderCustomerEmailShell("<p>Request received</p>")

  expect(html).toContain("avantia-build-rain-painter-animation.gif")
  expect(html).toContain("https://build.avantiap.com")
  expect(html).toContain("mailto:office@build.avantiap.com")
  expect(html).toContain("tel:+19292077156")
  expect(html).toContain("https://wa.me/19292077156")
  expect(html).toContain("(929) 207-7156")
})

test("requested material list shows quantities and safely escapes selections", () => {
  const html = renderRequestedItemsHtml([
    {
      name: "Drywall <5/8>",
      quantity: 40,
      unit: "sheets",
      details: ["Size: 4 x 12", "Type: Fire rated"],
    },
  ])

  expect(html).toContain("Drywall &lt;5/8&gt;")
  expect(html).toContain("40 sheets")
  expect(html).toContain("Size: 4 x 12")
  expect(html).toContain("Type: Fire rated")
})

test("cart confirmation sent to the client includes the requested item list and contact footer", async () => {
  let result: Awaited<ReturnType<typeof sendCartSubmissionEmail>> | undefined
  const deliveries = await captureEmailDeliveries(async () => {
    result = await sendCartSubmissionEmail({
      quoteId: "request-123",
      project: { id: "project-123", name: "Material request", address: "280 Lawrence Ave" },
      customer: { email: "client@example.com", profile: null },
      quoteItems: [{ name: "5/8 in. drywall", quantity: 30, unit: "sheets", unit_price: 0, line_total: 0 }],
      cartDetails: [],
      customLines: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    })
  })

  expect(result?.client.status).toBe("sent")
  const clientDelivery = deliveries.find((delivery) => delivery.to.includes("client@example.com"))
  expect(clientDelivery).toBeTruthy()
  expect(clientDelivery?.html).toContain("avantia-build-rain-painter-animation.gif")
  expect(clientDelivery?.html).toContain("Materials requested")
  expect(clientDelivery?.html).toContain("5/8 in. drywall")
  expect(clientDelivery?.html).toContain("30 sheets")
  expect(clientDelivery?.html).toContain("office@build.avantiap.com")
  expect(clientDelivery?.html).toContain("(929) 207-7156")
  expect(clientDelivery?.text).toContain("Materials requested:")
  expect(clientDelivery?.text).toContain("- 5/8 in. drywall: 30 sheets")
})

test("project request confirmation includes selections and attachments", async () => {
  const deliveries = await captureEmailDeliveries(() => sendProjectRequestNotificationEmail({
    requestId: "project-request-1",
    requestTitle: "Framing Quick Order",
    projectName: "Material request",
    projectAddress: "280 Lawrence Ave",
    clientName: "Jacob",
    clientEmail: "jacob@example.com",
    clientPhone: "5551234567",
    items: [{ name: "Framing lumber", department: "Framing", quantity: 80, unit: "pieces", details: ["2 x 4 x 10 ft."] }],
    attachmentNames: ["framing-plan.pdf"],
  }))

  const clientDelivery = deliveries.find((delivery) => delivery.to.includes("jacob@example.com"))
  expect(clientDelivery?.html).toContain("Framing lumber")
  expect(clientDelivery?.html).toContain("80 pieces")
  expect(clientDelivery?.html).toContain("2 x 4 x 10 ft.")
  expect(clientDelivery?.html).toContain("framing-plan.pdf")
  expect(clientDelivery?.html).toContain("avantia-build-rain-painter-animation.gif")
})

test("public quote confirmation includes the customer's request details", async () => {
  const deliveries = await captureEmailDeliveries(() => sendQuoteIntakeEmail({
    referenceId: "AB-TEST123",
    firstName: "Jacob",
    lastName: "Darry",
    email: "jacob@example.com",
    phone: "5551234567",
    company: "",
    customerType: "Contractor",
    projectName: "",
    projectType: "Renovation",
    street: "280 Lawrence Ave",
    city: "Lawrence",
    state: "NY",
    zip: "11559",
    timeframe: "ASAP",
    departments: ["Sheet rock"],
    details: "40 sheets of 5/8 in. fire-rated drywall",
    attachment: { filename: "material-list.pdf" },
  }))

  const clientDelivery = deliveries.find((delivery) => delivery.to.includes("jacob@example.com"))
  expect(clientDelivery?.html).toContain("Materials requested")
  expect(clientDelivery?.html).toContain("40 sheets of 5/8 in. fire-rated drywall")
  expect(clientDelivery?.html).toContain("material-list.pdf")
  expect(clientDelivery?.html).toContain("(929) 207-7156")
})

test("manager reply keeps the material list and company contacts in the email", async () => {
  const deliveries = await captureEmailDeliveries(() => sendManagerClientReplyEmail({
    requestId: "request-1",
    requestTitle: "Electrical Quick Order",
    recipientName: "Jacob",
    recipientEmail: "jacob@example.com",
    message: "We are reviewing availability now.",
    items: [{ name: "12/2 Romex", quantity: 5, unit: "rolls", details: ["250 ft. rolls"] }],
  }))

  const clientDelivery = deliveries.find((delivery) => delivery.to.includes("jacob@example.com"))
  expect(clientDelivery?.html).toContain("12/2 Romex")
  expect(clientDelivery?.html).toContain("5 rolls")
  expect(clientDelivery?.html).toContain("250 ft. rolls")
  expect(clientDelivery?.html).toContain("office@build.avantiap.com")
})

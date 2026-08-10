import type { ProfileRecord } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"
import type { ShopCartItemDetails, ShopCustomCartItem } from "@/lib/shop-cart"

type QuoteItemForEmail = {
  name: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

export type CartSubmissionEmailInput = {
  quoteId: string
  project: Pick<ProjectRecord, "id" | "name" | "address">
  customer: {
    email: string | null
    profile: ProfileRecord | null
  }
  quoteItems: QuoteItemForEmail[]
  cartDetails: ShopCartItemDetails[]
  customLines: ShopCustomCartItem[]
  subtotal: number
  tax: number
  total: number
}

export type EmailDeliveryResult =
  | { status: "sent"; providerId: string | null }
  | { status: "not_configured" }
  | { status: "skipped" }
  | { status: "failed"; error: string }

export type CartSubmissionEmailResult = {
  status: "sent" | "not_configured" | "failed"
  providerId: string | null
  owner: EmailDeliveryResult
  client: EmailDeliveryResult
}

const DEFAULT_TO = "avitanneto@gmail.com"
const DEFAULT_FROM = "Avantia Build <onboarding@resend.dev>"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function answerLines(details: Pick<ShopCartItemDetails | ShopCustomCartItem, "answers" | "qualificationStatus">) {
  if (details.answers.length === 0) return [`Status: ${details.qualificationStatus}`]
  return [`Status: ${details.qualificationStatus}`, ...details.answers.map((answer) => `${answer.label}: ${answer.value}`)]
}

function buildText(input: CartSubmissionEmailInput) {
  const profile = input.customer.profile
  const lines = [
    "New Avantia Build order request needs review",
    "",
    `Quote ID: ${input.quoteId}`,
    `Project: ${input.project.name}`,
    `Address: ${input.project.address || "Not provided"}`,
    "",
    `Customer email: ${input.customer.email || profile?.email || "Not provided"}`,
    `Customer name: ${profile?.full_name || "Not provided"}`,
    `Customer phone: ${profile?.phone || "Not provided"}`,
    `Company: ${profile?.company_name || "Not provided"}`,
    "",
    "Items:",
    ...input.quoteItems.map((item) => `- ${item.name}: ${item.quantity} ${item.unit} at ${money(item.unit_price)} = ${money(item.line_total)}`),
    "",
    `Subtotal: ${money(input.subtotal)}`,
    `Tax / fees: ${money(input.tax)}`,
    `Total: ${money(input.total)}`,
  ]

  const detailSections = [
    ...input.cartDetails.map((detail) => ({
      title: detail.productName,
      lines: answerLines(detail),
    })),
    ...input.customLines.map((item) => ({
      title: item.fileName ? `${item.name} (${item.fileName})` : item.name,
      lines: answerLines(item),
    })),
  ]

  if (detailSections.length > 0) {
    lines.push("", "Qualifying details:")
    for (const section of detailSections) {
      lines.push(`- ${section.title}`)
      for (const line of section.lines) {
        lines.push(`  ${line}`)
      }
    }
  }

  return lines.join("\n")
}

function buildHtml(input: CartSubmissionEmailInput) {
  const profile = input.customer.profile
  const detailSections = [
    ...input.cartDetails.map((detail) => ({
      title: detail.productName,
      lines: answerLines(detail),
    })),
    ...input.customLines.map((item) => ({
      title: item.fileName ? `${item.name} (${item.fileName})` : item.name,
      lines: answerLines(item),
    })),
  ]

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="margin:0 0 12px;font-size:22px">New Avantia Build order request needs review</h1>
      <p><strong>Quote ID:</strong> ${escapeHtml(input.quoteId)}</p>
      <p><strong>Project:</strong> ${escapeHtml(input.project.name)}<br />
      <strong>Address:</strong> ${escapeHtml(input.project.address || "Not provided")}</p>
      <h2 style="margin-top:24px;font-size:16px">Customer</h2>
      <p>
        <strong>Email:</strong> ${escapeHtml(input.customer.email || profile?.email || "Not provided")}<br />
        <strong>Name:</strong> ${escapeHtml(profile?.full_name || "Not provided")}<br />
        <strong>Phone:</strong> ${escapeHtml(profile?.phone || "Not provided")}<br />
        <strong>Company:</strong> ${escapeHtml(profile?.company_name || "Not provided")}
      </p>
      <h2 style="margin-top:24px;font-size:16px">Items</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">
        <thead>
          <tr style="background:#f1f5f9;text-align:left">
            <th>Item</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${input.quoteItems.map((item) => `
            <tr>
              <td style="border-top:1px solid #e2e8f0">${escapeHtml(item.name)}</td>
              <td style="border-top:1px solid #e2e8f0">${item.quantity}</td>
              <td style="border-top:1px solid #e2e8f0">${escapeHtml(item.unit)}</td>
              <td style="border-top:1px solid #e2e8f0">${money(item.unit_price)}</td>
              <td style="border-top:1px solid #e2e8f0">${money(item.line_total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <p style="margin-top:16px">
        <strong>Subtotal:</strong> ${money(input.subtotal)}<br />
        <strong>Tax / fees:</strong> ${money(input.tax)}<br />
        <strong>Total:</strong> ${money(input.total)}
      </p>
      ${detailSections.length > 0 ? `
        <h2 style="margin-top:24px;font-size:16px">Qualifying details</h2>
        ${detailSections.map((section) => `
          <div style="margin:0 0 12px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">
            <strong>${escapeHtml(section.title)}</strong>
            <ul style="margin:8px 0 0;padding-left:18px">
              ${section.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      ` : ""}
    </div>
  `
}

function buildClientText(input: CartSubmissionEmailInput) {
  const profile = input.customer.profile
  return [
    `Hi ${profile?.full_name || "there"},`,
    "",
    "We received your Avantia Build request and our team will review it.",
    "",
    `Request ID: ${input.quoteId}`,
    `Project: ${input.project.name}`,
    `Address: ${input.project.address || "Not provided"}`,
    `Items: ${input.quoteItems.length}`,
    `Estimated request total: ${money(input.total)}`,
    "",
    "We will contact you if we need more information. This message confirms receipt and is not a final quote or invoice.",
    "",
    "Avantia Build",
    "Everything it takes to build",
  ].join("\n")
}

function buildClientHtml(input: CartSubmissionEmailInput) {
  const profile = input.customer.profile
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:0 auto">
      <p>Hi ${escapeHtml(profile?.full_name || "there")},</p>
      <h1 style="margin:12px 0;font-size:22px">We received your request</h1>
      <p>Our Avantia Build team will review the materials and details you submitted.</p>
      <div style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
        <strong>Request ID:</strong> ${escapeHtml(input.quoteId)}<br />
        <strong>Project:</strong> ${escapeHtml(input.project.name)}<br />
        <strong>Address:</strong> ${escapeHtml(input.project.address || "Not provided")}<br />
        <strong>Items:</strong> ${input.quoteItems.length}<br />
        <strong>Estimated request total:</strong> ${money(input.total)}
      </div>
      <p>We will contact you if we need more information. This confirmation is not a final quote or invoice.</p>
      <p style="margin-top:24px"><strong>Avantia Build</strong><br /><span style="color:#64748b">Everything it takes to build</span></p>
    </div>
  `
}

async function sendEmail(input: {
  apiKey: string
  from: string
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  idempotencyKey: string
  attachments?: Array<{ filename: string; content: string }>
}): Promise<EmailDeliveryResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        attachments: input.attachments?.length ? input.attachments : undefined,
      }),
    })

    const payload = (await response.json().catch(() => null)) as { id?: string; message?: string; error?: string } | null
    if (!response.ok) return { status: "failed", error: payload?.message || payload?.error || `Resend returned ${response.status}` }
    return { status: "sent", providerId: payload?.id ?? null }
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" }
  }
}

export type QuoteIntakeEmailInput = {
  referenceId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  customerType: string
  projectName: string
  projectType: string
  street: string
  city: string
  state: string
  zip: string
  timeframe: string
  departments: string[]
  details: string
  attachment?: { filename: string; content?: string }
}

export async function sendQuoteIntakeEmail(input: QuoteIntakeEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      owner: { status: "not_configured" } as EmailDeliveryResult,
      client: { status: "not_configured" } as EmailDeliveryResult,
    }
  }

  const to = process.env.QUOTE_SUBMISSION_TO || DEFAULT_TO
  const from = process.env.QUOTE_SUBMISSION_FROM || DEFAULT_FROM
  const fullName = `${input.firstName} ${input.lastName}`.trim()
  const address = [input.street, input.city, input.state, input.zip].filter(Boolean).join(", ")
  const departmentText = input.departments.join(", ") || "Not specified"
  const text = [
    "New Avantia Build quote request",
    "",
    `Reference: ${input.referenceId}`,
    `Customer: ${fullName}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone || "Not provided"}`,
    `Company: ${input.company || "Not provided"}`,
    `Customer type: ${input.customerType || "Not provided"}`,
    "",
    `Project: ${input.projectName || "Not named"}`,
    `Project type: ${input.projectType || "Not provided"}`,
    `Job site: ${address || "Not provided"}`,
    `Needed: ${input.timeframe || "Not provided"}`,
    `Departments: ${departmentText}`,
    "",
    "Request details:",
    input.details || "See attached file",
    "",
    `Attachment: ${input.attachment?.filename || "None"}`,
  ].join("\n")
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:680px;margin:0 auto">
      <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Avantia Build quote request</p>
      <h1 style="margin:0 0 20px;font-size:24px">New request from ${escapeHtml(fullName)}</h1>
      <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
        <strong>Reference:</strong> ${escapeHtml(input.referenceId)}<br />
        <strong>Email:</strong> ${escapeHtml(input.email)}<br />
        <strong>Phone:</strong> ${escapeHtml(input.phone || "Not provided")}<br />
        <strong>Company:</strong> ${escapeHtml(input.company || "Not provided")}<br />
        <strong>Customer type:</strong> ${escapeHtml(input.customerType || "Not provided")}
      </div>
      <h2 style="margin:24px 0 8px;font-size:17px">Project</h2>
      <p><strong>Name:</strong> ${escapeHtml(input.projectName || "Not named")}<br />
      <strong>Type:</strong> ${escapeHtml(input.projectType || "Not provided")}<br />
      <strong>Job site:</strong> ${escapeHtml(address || "Not provided")}<br />
      <strong>Needed:</strong> ${escapeHtml(input.timeframe || "Not provided")}<br />
      <strong>Departments:</strong> ${escapeHtml(departmentText)}</p>
      <h2 style="margin:24px 0 8px;font-size:17px">Request details</h2>
      <p style="white-space:pre-wrap">${escapeHtml(input.details || "See attached file")}</p>
      <p style="margin-top:20px;color:#64748b;font-size:13px">Attachment: ${escapeHtml(input.attachment?.filename || "None")}</p>
    </div>
  `

  const owner = await sendEmail({
    apiKey,
    from,
    to,
    subject: `New quote request: ${input.projectName || fullName}`,
    html,
    text,
    replyTo: input.email,
    idempotencyKey: `avantia-intake-owner-${input.referenceId}`,
    attachments: input.attachment?.content ? [{ filename: input.attachment.filename, content: input.attachment.content }] : undefined,
  })

  const clientText = [
    `Hi ${input.firstName},`,
    "",
    "We received your Avantia Build quote request.",
    `Reference: ${input.referenceId}`,
    `Project: ${input.projectName || "Not named"}`,
    "",
    "Our team will review the details and contact you if anything else is needed.",
    "",
    "Avantia Build",
    "Everything it takes to build",
  ].join("\n")
  const client = owner.status === "sent"
    ? await sendEmail({
        apiKey,
        from,
        to: input.email,
        subject: `We received your quote request: ${input.projectName || input.referenceId}`,
        html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:620px;margin:0 auto"><p>Hi ${escapeHtml(input.firstName)},</p><h1 style="font-size:22px">We received your quote request</h1><p><strong>Reference:</strong> ${escapeHtml(input.referenceId)}<br /><strong>Project:</strong> ${escapeHtml(input.projectName || "Not named")}</p><p>Our Avantia Build team will review the details and contact you if anything else is needed.</p><p style="margin-top:24px"><strong>Avantia Build</strong><br /><span style="color:#64748b">Everything it takes to build</span></p></div>`,
        text: clientText,
        replyTo: to,
        idempotencyKey: `avantia-intake-client-${input.referenceId}`,
      })
    : { status: "skipped" as const }

  return { owner, client }
}

export async function sendCartSubmissionEmail(input: CartSubmissionEmailInput): Promise<CartSubmissionEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      status: "not_configured",
      providerId: null,
      owner: { status: "not_configured" },
      client: { status: "not_configured" },
    }
  }

  const to = process.env.QUOTE_SUBMISSION_TO || DEFAULT_TO
  const from = process.env.QUOTE_SUBMISSION_FROM || DEFAULT_FROM
  const clientEmail = input.customer.email || input.customer.profile?.email || ""
  const owner = await sendEmail({
    apiKey,
    from,
    to,
    subject: `New Avantia Build request: ${input.project.name}`,
    html: buildHtml(input),
    text: buildText(input),
    replyTo: clientEmail || undefined,
    idempotencyKey: `avantia-order-owner-${input.quoteId}`,
  })
  const client = clientEmail
    ? await sendEmail({
        apiKey,
        from,
        to: clientEmail,
        subject: `We received your Avantia Build request: ${input.project.name}`,
        html: buildClientHtml(input),
        text: buildClientText(input),
        replyTo: to,
        idempotencyKey: `avantia-order-client-${input.quoteId}`,
      })
    : { status: "skipped" as const }

  return {
    status: owner.status === "sent" ? "sent" : owner.status === "not_configured" ? "not_configured" : "failed",
    providerId: owner.status === "sent" ? owner.providerId : null,
    owner,
    client,
  }
}

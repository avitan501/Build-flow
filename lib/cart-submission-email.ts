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

export type ManagerClientReplyEmailInput = {
  requestId: string
  requestTitle: string
  recipientName: string
  recipientEmail: string
  message: string
  items: CustomerEmailItem[]
}

export type CustomerEmailItem = {
  name: string
  quantity?: number | null
  unit?: string | null
  details?: string[]
}

export type SupplierQuoteRequestEmailInput = {
  requestId: string
  supplierName: string
  contactName: string | null
  recipientEmail: string
  jobAddress: string
  materialList: string
}

export type ClientQuoteEmailInput = {
  comparisonId: string
  quoteNumber: string
  recipientName: string
  recipientEmail: string
  jobAddress: string
  expiresOn: string | null
  message: string
  items: Array<{
    description: string
    specification: string
    quantity: number
    unit: string
    unitPrice: number
    lineTotal: number
  }>
  deliveryCharge: number
  total: number
  pdfBase64: string
  idempotencyKey: string
}

export type ClientRequestActionEmailInput = {
  requestId: string
  requestTitle: string
  projectName: string
  clientName: string
  clientEmail: string | null
  actionLabel: string
  message: string
}

export type ProjectRequestNotificationEmailInput = {
  requestId: string
  requestTitle: string
  projectName: string
  projectAddress: string | null
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  items: Array<{
    name: string
    department: string
    quantity: number
    unit: string | null
    details: string[]
  }>
  attachmentNames: string[]
}

export type ProjectRequestNotificationEmailResult = {
  owner: EmailDeliveryResult
  client: EmailDeliveryResult
}

type ProjectRequestNotificationFallback = (payload: Record<string, unknown>) => Promise<{
  owner?: EmailDeliveryResult
  client?: EmailDeliveryResult
  result?: EmailDeliveryResult
}>

const SITE_URL = "https://build.avantiap.com"
const COMPANY_EMAIL = "office@build.avantiap.com"
const COMPANY_PHONE = "(516) 908-8319"
const COMPANY_PHONE_LINK = "tel:+15169088319"
const COMPANY_WHATSAPP_URL = "https://wa.me/15169088319"
const CUSTOMER_EMAIL_LOGO_URL = `${SITE_URL}/images/avantia/avantia-build-rain-painter-animation.gif`
const EMAIL_LOGO_URL = `${SITE_URL}/images/avantia/avantia-build-lockup-share.png`
const DEFAULT_TO = "avitanneto@gmail.com"
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL?.trim() || `Avantia Build <${COMPANY_EMAIL}>`
const RESEND_TEST_FROM = "Avantia Build Requests <onboarding@resend.dev>"

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

function companyContactText() {
  return [
    "Avantia Build",
    "Everything it takes to build",
    COMPANY_EMAIL,
    COMPANY_PHONE,
    SITE_URL,
    `WhatsApp: ${COMPANY_WHATSAPP_URL}`,
  ].join("\n")
}

function customerEmailHeader() {
  return `
    <div style="padding:18px 22px;border-bottom:1px solid #e5eaf1;background:#ffffff">
      <a href="${SITE_URL}" style="display:inline-block;text-decoration:none">
        <img src="${CUSTOMER_EMAIL_LOGO_URL}" width="280" alt="Avantia Build" style="display:block;width:100%;max-width:280px;height:auto;border:0" />
      </a>
    </div>
  `
}

function customerEmailFooter() {
  return `
    <div style="padding:18px 22px;border-top:1px solid #e5eaf1;background:#f8fafc;color:#475569;font-size:13px;line-height:1.65">
      <strong style="color:#071126;font-size:15px">Avantia Build</strong><br />
      <span>Everything it takes to build</span><br />
      <a href="${SITE_URL}" style="color:#0066cc;text-decoration:none">build.avantiap.com</a><br />
      <a href="mailto:${COMPANY_EMAIL}" style="color:#0066cc;text-decoration:none">${COMPANY_EMAIL}</a><br />
      <a href="${COMPANY_PHONE_LINK}" style="color:#0066cc;text-decoration:none">${COMPANY_PHONE}</a>
      <span style="color:#94a3b8"> &middot; </span>
      <a href="${COMPANY_WHATSAPP_URL}" style="color:#0066cc;text-decoration:none">WhatsApp us</a>
    </div>
  `
}

export function renderCustomerEmailShell(content: string) {
  return `
    <div style="margin:0;background:#eef2f6;padding:24px 10px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:14px;background:#ffffff">
        ${customerEmailHeader()}
        <div style="padding:24px 22px">${content}</div>
        ${customerEmailFooter()}
      </div>
    </div>
  `
}

function itemQuantity(item: CustomerEmailItem) {
  if (item.quantity === null || item.quantity === undefined) return ""
  return `${item.quantity} ${item.unit?.trim() || "item"}`
}

export function renderRequestedItemsHtml(items: CustomerEmailItem[], emptyLabel = "See the request details or attached file.") {
  if (items.length === 0) {
    return `<p style="margin:8px 0 0;color:#64748b">${escapeHtml(emptyLabel)}</p>`
  }

  return `
    <div style="margin-top:10px;border:1px solid #dbe3ee;border-radius:10px;overflow:hidden">
      ${items.map((item, index) => `
        <div style="padding:13px 14px;${index ? "border-top:1px solid #e5eaf1;" : ""}background:${index % 2 ? "#f8fafc" : "#ffffff"}">
          <strong style="color:#071126">${escapeHtml(item.name)}</strong>
          ${itemQuantity(item) ? `<br /><span style="color:#475569">${escapeHtml(itemQuantity(item))}</span>` : ""}
          ${item.details?.length ? `<ul style="margin:7px 0 0;padding-left:18px;color:#475569">${item.details.filter(Boolean).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}
        </div>
      `).join("")}
    </div>
  `
}

function requestedItemsText(items: CustomerEmailItem[], emptyLabel = "See the request details or attached file.") {
  if (items.length === 0) return emptyLabel
  return items.flatMap((item) => [
    `- ${item.name}${itemQuantity(item) ? `: ${itemQuantity(item)}` : ""}`,
    ...(item.details ?? []).filter(Boolean).map((detail) => `  ${detail}`),
  ]).join("\n")
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
  const items = cartCustomerItems(input)
  return [
    `Hi ${profile?.full_name || "there"},`,
    "",
    "We received your Avantia Build request and our team will review it.",
    "",
    `Request ID: ${input.quoteId}`,
    `Project: ${input.project.name}`,
    `Address: ${input.project.address || "Not provided"}`,
    `Estimated request total: ${money(input.total)}`,
    "",
    "Materials requested:",
    requestedItemsText(items),
    "",
    "We will contact you if we need more information. This message confirms receipt and is not a final quote or invoice.",
    "",
    companyContactText(),
  ].join("\n")
}

function cartCustomerItems(input: CartSubmissionEmailInput): CustomerEmailItem[] {
  const detailSections = [
    ...input.cartDetails.map((detail) => ({ title: detail.productName, lines: answerLines(detail) })),
    ...input.customLines.map((item) => ({ title: item.name, lines: answerLines(item) })),
  ]

  return input.quoteItems.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    details: detailSections.filter((section) => section.title === item.name).flatMap((section) => section.lines),
  }))
}

function buildClientHtml(input: CartSubmissionEmailInput) {
  const profile = input.customer.profile
  const items = cartCustomerItems(input)
  return renderCustomerEmailShell(`
    <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request received</p>
    <h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">We received your request</h1>
    <p style="margin:12px 0;color:#475569">Hi ${escapeHtml(profile?.full_name || "there")}, our team will review the materials and details you submitted.</p>
    <div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc">
      <strong>Request ID:</strong> ${escapeHtml(input.quoteId)}<br />
      <strong>Project:</strong> ${escapeHtml(input.project.name)}<br />
      <strong>Address:</strong> ${escapeHtml(input.project.address || "Not provided")}<br />
      <strong>Estimated request total:</strong> ${money(input.total)}
    </div>
    <h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>
    ${renderRequestedItemsHtml(items)}
    <p style="margin:22px 0 0;color:#475569">We will contact you if we need more information. This confirmation is not a final quote or invoice.</p>
  `)
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
  allowTestFallback?: boolean
}): Promise<EmailDeliveryResult> {
  const deliver = async (from: string, idempotencyKey: string) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        attachments: input.attachments?.length ? input.attachments : undefined,
      }),
    })

    const payload = (await response.json().catch(() => null)) as { id?: string; message?: string; error?: string } | null
    if (!response.ok) return { status: "failed" as const, error: payload?.message || payload?.error || `Resend returned ${response.status}` }
    return { status: "sent" as const, providerId: payload?.id ?? null }
  }

  try {
    const primary = await deliver(input.from, input.idempotencyKey)
    if (primary.status === "sent" || input.from !== DEFAULT_FROM || input.allowTestFallback === false) return primary

    const fallback = await deliver(RESEND_TEST_FROM, `${input.idempotencyKey}-verified-owner-fallback`)
    return fallback.status === "sent" ? fallback : primary
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" }
  }
}

export async function sendSupplierQuoteRequestEmail(input: SupplierQuoteRequestEmailInput): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { status: "not_configured" }

  const subject = `Quote Request - ${input.jobAddress}`
  const greeting = input.contactName?.trim() || input.supplierName
  const text = [
    `Hello ${greeting},`,
    "",
    `Please provide pricing and availability for the following materials for our project at ${input.jobAddress}:`,
    "",
    input.materialList.trim(),
    "",
    "Please include lead times, delivery availability, and any delivery charges.",
    "Reply to this email with your quote or any questions.",
    "",
    "Avantia Build",
    COMPANY_EMAIL,
    SITE_URL,
  ].join("\n")
  const html = `
    <div style="margin:0;background:#f3f6f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      <div style="max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:16px;background:#ffffff">
        <div style="padding:20px 22px;border-bottom:1px solid #e5eaf1">
          <strong style="font-size:19px;color:#071126">Avantia Build</strong><br />
          <span style="font-size:13px;color:#64748b">Material sourcing desk</span>
        </div>
        <div style="padding:24px 22px">
          <p style="margin:0 0 14px">Hello ${escapeHtml(greeting)},</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25;color:#071126">Material quote request</h1>
          <p style="margin:12px 0 0;color:#475569">Please provide pricing and availability for the materials below.</p>
          <div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc">
            <strong>Job location</strong><br />${escapeHtml(input.jobAddress)}
          </div>
          <h2 style="margin:22px 0 8px;font-size:16px">Material list</h2>
          <div style="white-space:pre-wrap;border-left:3px solid #0071e3;padding:4px 0 4px 14px">${escapeHtml(input.materialList.trim())}</div>
          <p style="margin:22px 0 0">Please include lead times, delivery availability, and any delivery charges.</p>
          <p style="margin:10px 0 0">Reply to this email with your quote or any questions.</p>
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5eaf1;color:#64748b;font-size:13px">
            <strong style="color:#071126">Avantia Build</strong><br />
            <a href="mailto:${COMPANY_EMAIL}" style="color:#0066cc">${COMPANY_EMAIL}</a> · <a href="${SITE_URL}" style="color:#0066cc">build.avantiap.com</a>
          </div>
        </div>
      </div>
    </div>`

  return sendEmail({
    apiKey,
    from: DEFAULT_FROM,
    to: input.recipientEmail,
    subject,
    html,
    text,
    replyTo: COMPANY_EMAIL,
    idempotencyKey: `avantia-supplier-quote-${input.requestId}`,
    allowTestFallback: false,
  })
}

export async function sendClientQuoteEmail(input: ClientQuoteEmailInput): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { status: "not_configured" }

  const subject = `Avantia Build material quote ${input.quoteNumber}`
  const expiration = input.expiresOn
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${input.expiresOn}T12:00:00`))
    : "Not specified"
  const itemText = input.items.map((item) => `${item.quantity} ${item.unit} - ${item.description}${item.specification ? ` (${item.specification})` : ""}: ${money(item.lineTotal)}`)
  const text = [
    `Hi ${input.recipientName},`,
    "",
    `Your Avantia Build material quote ${input.quoteNumber} is ready.`,
    `Job location: ${input.jobAddress || "Not provided"}`,
    `Valid through: ${expiration}`,
    "",
    "Materials:",
    ...itemText,
    ...(input.deliveryCharge > 0 ? [`Delivery: ${money(input.deliveryCharge)}`] : []),
    `Total: ${money(input.total)}`,
    ...(input.message.trim() ? ["", input.message.trim()] : []),
    "",
    "The full branded quote is attached as a PDF.",
    "",
    "Avantia Build",
    COMPANY_EMAIL,
    COMPANY_PHONE,
    SITE_URL,
  ].join("\n")
  const html = `
    <div style="margin:0;background:#eef2f6;padding:24px 10px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <div style="max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:14px;background:#ffffff">
        <div style="padding:18px 22px;border-bottom:1px solid #e5eaf1">
          <a href="${SITE_URL}" style="display:inline-block;text-decoration:none"><img src="${EMAIL_LOGO_URL}" width="250" alt="Avantia Build" style="display:block;width:100%;max-width:250px;height:auto;border:0" /></a>
        </div>
        <div style="padding:24px 22px">
          <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Material quote</p>
          <h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">Your quote is ready</h1>
          <p style="margin:12px 0;color:#475569">Hi ${escapeHtml(input.recipientName)}, we prepared quote <strong>${escapeHtml(input.quoteNumber)}</strong> for your material request.</p>
          <div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc">
            <strong>Job location:</strong> ${escapeHtml(input.jobAddress || "Not provided")}<br />
            <strong>Valid through:</strong> ${escapeHtml(expiration)}
          </div>
          <table role="presentation" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#071126;color:#ffffff;text-align:left"><th>Material</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
            <tbody>${input.items.map((item) => `<tr><td style="border-bottom:1px solid #e5eaf1"><strong>${escapeHtml(item.description)}</strong>${item.specification ? `<br /><span style="color:#64748b">${escapeHtml(item.specification)}</span>` : ""}</td><td style="border-bottom:1px solid #e5eaf1">${item.quantity} ${escapeHtml(item.unit)}</td><td style="border-bottom:1px solid #e5eaf1;text-align:right">${money(item.lineTotal)}</td></tr>`).join("")}</tbody>
          </table>
          <div style="margin:18px 0 0;text-align:right;color:#475569">
            ${input.deliveryCharge > 0 ? `<div>Delivery: ${money(input.deliveryCharge)}</div>` : ""}
            <div style="margin-top:5px;font-size:19px;font-weight:700;color:#071126">Total: ${money(input.total)}</div>
          </div>
          ${input.message.trim() ? `<p style="margin:22px 0 0;white-space:pre-wrap;color:#475569">${escapeHtml(input.message.trim())}</p>` : ""}
          <p style="margin:22px 0 0;color:#475569">The complete Avantia Build quote is attached as a PDF. Reply to this email with any questions or requested changes.</p>
        </div>
        <div style="padding:18px 22px;border-top:1px solid #e5eaf1;background:#f8fafc;color:#475569;font-size:13px;line-height:1.65">
          <strong style="color:#071126">Avantia Build</strong><br />
          <a href="${SITE_URL}" style="color:#0066cc;text-decoration:none">build.avantiap.com</a><br />
          <a href="mailto:${COMPANY_EMAIL}" style="color:#0066cc;text-decoration:none">${COMPANY_EMAIL}</a><br />
          <a href="${COMPANY_PHONE_LINK}" style="color:#0066cc;text-decoration:none">${COMPANY_PHONE}</a>
          <span style="color:#94a3b8"> &middot; </span><a href="${COMPANY_WHATSAPP_URL}" style="color:#0066cc;text-decoration:none">WhatsApp us</a>
        </div>
      </div>
    </div>`

  return sendEmail({
    apiKey,
    from: DEFAULT_FROM,
    to: input.recipientEmail,
    subject,
    html,
    text,
    replyTo: COMPANY_EMAIL,
    idempotencyKey: input.idempotencyKey,
    attachments: [{ filename: `${input.quoteNumber}.pdf`, content: input.pdfBase64 }],
    allowTestFallback: false,
  })
}

export async function sendManagerClientReplyEmail(input: ManagerClientReplyEmailInput): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = DEFAULT_FROM
  const subject = `Avantia Build request: ${input.requestTitle}`
  const text = [
    input.message.trim(),
    "",
    `Request: ${input.requestTitle}`,
    "",
    "Materials requested:",
    requestedItemsText(input.items),
    "",
    companyContactText(),
  ].join("\n")
  const html = renderCustomerEmailShell(`
    <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request update</p>
    <h1 style="margin:0;font-size:24px;line-height:1.25;color:#071126">${escapeHtml(input.requestTitle)}</h1>
    <p style="margin:16px 0;white-space:pre-wrap;color:#334155">${escapeHtml(input.message.trim())}</p>
    <h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>
    ${renderRequestedItemsHtml(input.items)}
  `)

  if (apiKey) {
    const directResult = await sendEmail({
      apiKey,
      from,
      to: input.recipientEmail,
      subject,
      html,
      text,
      replyTo: COMPANY_EMAIL,
      idempotencyKey: `avantia-manager-reply-${input.requestId}-${crypto.randomUUID()}`,
    })
    if (directResult.status === "sent") return directResult
  }

  const fallback = await sendWithSupabaseEmailFallback("send_manager_reply", {
    requestId: input.requestId,
    message: input.message,
    items: input.items,
  })
  return fallback.result ?? { status: "failed", error: "Website email could not be sent." }
}

export async function sendClientRequestActionEmail(input: ClientRequestActionEmailInput): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { status: "not_configured" }

  const from = DEFAULT_FROM
  const subject = `${input.actionLabel}: ${input.requestTitle}`
  const text = [
    `Client action: ${input.actionLabel}`,
    `Client: ${input.clientName}`,
    `Email: ${input.clientEmail || "Not provided"}`,
    `Project: ${input.projectName}`,
    `Request: ${input.requestTitle}`,
    "",
    input.message,
  ].join("\n")
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:620px;margin:0 auto">
      <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(input.actionLabel)}</h1>
      <p><strong>Client:</strong> ${escapeHtml(input.clientName)}<br />
      <strong>Email:</strong> ${escapeHtml(input.clientEmail || "Not provided")}<br />
      <strong>Project:</strong> ${escapeHtml(input.projectName)}<br />
      <strong>Request:</strong> ${escapeHtml(input.requestTitle)}</p>
      <div style="margin-top:20px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;white-space:pre-wrap">${escapeHtml(input.message)}</div>
    </div>
  `

  return sendEmail({
    apiKey,
    from,
    to: DEFAULT_TO,
    subject,
    html,
    text,
    replyTo: input.clientEmail || undefined,
    idempotencyKey: `avantia-client-action-${input.requestId}-${crypto.randomUUID()}`,
  })
}

export async function sendProjectRequestNotificationEmail(
  input: ProjectRequestNotificationEmailInput,
  authenticatedFallback?: ProjectRequestNotificationFallback,
): Promise<ProjectRequestNotificationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const sendFallback = authenticatedFallback ?? ((payload: Record<string, unknown>) => sendWithSupabaseEmailFallback("send_order_notifications", payload))
  const fallbackOrder = {
    quoteId: input.requestId,
    project: { name: input.projectName, address: input.projectAddress },
    customer: {
      email: input.clientEmail,
      profile: { email: input.clientEmail, full_name: input.clientName, phone: input.clientPhone, company_name: null },
    },
    quoteItems: input.items.map((item) => ({
      name: [item.name, ...item.details].join(" | "),
      quantity: item.quantity,
      unit: item.unit || "item",
      unit_price: 0,
      line_total: 0,
    })),
    cartDetails: [],
    customLines: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  }

  if (!apiKey) {
    const fallback = await sendFallback({
      order: fallbackOrder,
      sendOwner: true,
      sendClient: Boolean(input.clientEmail),
    })
    return {
      owner: fallback.owner ?? fallback.result ?? { status: "not_configured" },
      client: input.clientEmail ? fallback.client ?? fallback.result ?? { status: "not_configured" } : { status: "skipped" },
    }
  }

  const itemLines = input.items.flatMap((item) => [
    `${item.department}: ${item.name} - ${item.quantity} ${item.unit || "item"}`,
    ...item.details.map((detail) => `  ${detail}`),
  ])
  const text = [
    "New Avantia Build project request",
    "",
    `Request: ${input.requestTitle}`,
    `Project: ${input.projectName}`,
    `Address: ${input.projectAddress || "Not provided"}`,
    `Client: ${input.clientName}`,
    `Email: ${input.clientEmail || "Not provided"}`,
    `Phone: ${input.clientPhone || "Not provided"}`,
    "",
    "Items:",
    ...itemLines,
    ...(input.attachmentNames.length ? ["", "Attachments:", ...input.attachmentNames.map((name) => `- ${name}`)] : []),
  ].join("\n")
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55;max-width:680px;margin:0 auto">
      <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Avantia Build project request</p>
      <h1 style="margin:0 0 18px;font-size:24px">${escapeHtml(input.requestTitle)}</h1>
      <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
        <strong>Project:</strong> ${escapeHtml(input.projectName)}<br />
        <strong>Address:</strong> ${escapeHtml(input.projectAddress || "Not provided")}<br />
        <strong>Client:</strong> ${escapeHtml(input.clientName)}<br />
        <strong>Email:</strong> ${escapeHtml(input.clientEmail || "Not provided")}<br />
        <strong>Phone:</strong> ${escapeHtml(input.clientPhone || "Not provided")}
      </div>
      <h2 style="margin:24px 0 10px;font-size:17px">Items and selections</h2>
      ${input.items.map((item) => `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0"><strong>${escapeHtml(item.department)}: ${escapeHtml(item.name)}</strong><br /><span>${item.quantity} ${escapeHtml(item.unit || "item")}</span>${item.details.length ? `<ul style="margin:8px 0 0;padding-left:18px">${item.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}</div>`).join("")}
      ${input.attachmentNames.length ? `<h2 style="margin:24px 0 10px;font-size:17px">Attachments</h2><ul>${input.attachmentNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : ""}
    </div>
  `
  const owner = await sendEmail({
    apiKey,
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
    subject: `New ${input.requestTitle}: ${input.projectName}`,
    html,
    text,
    replyTo: input.clientEmail || undefined,
    idempotencyKey: `avantia-project-request-owner-${input.requestId}`,
  })

  if (!input.clientEmail) {
    if (owner.status === "sent") return { owner, client: { status: "skipped" } }
    const fallback = await sendFallback({ order: fallbackOrder, sendOwner: true, sendClient: false })
    return { owner: fallback.owner ?? fallback.result ?? owner, client: { status: "skipped" } }
  }
  const clientText = [
    `Hi ${input.clientName || "there"},`,
    "",
    `We received your ${input.requestTitle}.`,
    `Project: ${input.projectName}`,
    "",
    "Materials requested:",
    requestedItemsText(input.items),
    ...(input.attachmentNames.length ? ["", "Attachments:", ...input.attachmentNames.map((name) => `- ${name}`)] : []),
    "",
    "Someone from Avantia Build will review it and get back to you within 24 hours.",
    "",
    companyContactText(),
  ].join("\n")
  const clientHtml = renderCustomerEmailShell(`
    <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request received</p>
    <h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">We received your request</h1>
    <p style="margin:12px 0;color:#475569">Hi ${escapeHtml(input.clientName || "there")}, someone from Avantia Build will review it and get back to you within 24 hours.</p>
    <div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc">
      <strong>Request:</strong> ${escapeHtml(input.requestTitle)}<br />
      <strong>Project:</strong> ${escapeHtml(input.projectName)}
      ${input.projectAddress ? `<br /><strong>Address:</strong> ${escapeHtml(input.projectAddress)}` : ""}
    </div>
    <h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>
    ${renderRequestedItemsHtml(input.items)}
    ${input.attachmentNames.length ? `<h2 style="margin:22px 0 8px;font-size:17px;color:#071126">Attachments</h2><ul style="margin:0;padding-left:18px;color:#475569">${input.attachmentNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : ""}
  `)
  const client = await sendEmail({
    apiKey,
    from: DEFAULT_FROM,
    to: input.clientEmail,
    subject: `We received your request: ${input.requestTitle}`,
    html: clientHtml,
    text: clientText,
    replyTo: COMPANY_EMAIL,
    idempotencyKey: `avantia-project-request-client-${input.requestId}`,
  })
  if (owner.status === "sent" && client.status === "sent") return { owner, client }
  const fallback = await sendFallback({
    order: fallbackOrder,
    sendOwner: owner.status !== "sent",
    sendClient: client.status !== "sent",
  })
  return {
    owner: owner.status === "sent" ? owner : fallback.owner ?? fallback.result ?? owner,
    client: client.status === "sent" ? client : fallback.client ?? fallback.result ?? client,
  }
}

export type QuoteIntakeEmailInput = {
  requestKind?: "quote_request" | "beat_quote"
  requestId?: string
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

async function sendWithSupabaseEmailFallback(
  action: "send_manager_reply" | "send_quote_notifications" | "send_order_notifications",
  payload: Record<string, unknown>,
): Promise<{ owner?: EmailDeliveryResult; client?: EmailDeliveryResult; result?: EmailDeliveryResult }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return { result: { status: "not_configured" } }

  try {
    const response = await fetch(`${url}/functions/v1/public-quote-intake`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store",
    })
    const body = (await response.json().catch(() => null)) as {
      owner?: EmailDeliveryResult
      client?: EmailDeliveryResult
      result?: EmailDeliveryResult
      error?: string
    } | null
    if (!response.ok) return { result: { status: "failed", error: body?.error || `Email service returned ${response.status}` } }
    return body ?? { result: { status: "failed", error: "Email service returned an empty response" } }
  } catch (error) {
    return { result: { status: "failed", error: error instanceof Error ? error.message : "Email service could not be reached" } }
  }
}

export async function sendQuoteIntakeEmail(input: QuoteIntakeEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    const fallback = await sendWithSupabaseEmailFallback("send_quote_notifications", {
      requestId: input.requestId,
      quote: { ...input, attachment: input.attachment ? { filename: input.attachment.filename } : undefined },
      sendOwner: true,
      sendClient: true,
    })
    return {
      owner: fallback.owner ?? fallback.result ?? { status: "failed", error: "Owner email could not be sent." },
      client: fallback.client ?? fallback.result ?? { status: "failed", error: "Client email could not be sent." },
    }
  }

  const to = DEFAULT_TO
  const from = DEFAULT_FROM
  const fullName = `${input.firstName} ${input.lastName}`.trim()
  const address = [input.street, input.city, input.state, input.zip].filter(Boolean).join(", ")
  const departmentText = input.departments.join(", ") || "Not specified"
  const beatQuote = input.requestKind === "beat_quote"
  const requestUrl = input.requestId
    ? `${SITE_URL}/owner/materials/requests/${encodeURIComponent(input.requestId)}`
    : `${SITE_URL}/owner/materials/requests`
  const text = [
    beatQuote ? "New Avantia Build quote to beat" : "New Avantia Build quote request",
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
    <div style="margin:0;background:#f2f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <div style="max-width:680px;margin:0 auto;overflow:hidden;border:1px solid #dbe3ee;border-radius:16px;background:#ffffff">
        <div style="padding:20px 22px;border-bottom:1px solid #e5eaf1">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px"><img src="${SITE_URL}/images/avantia/avantia-app-icon-512.png" width="46" height="46" alt="" style="display:block;border-radius:12px" /></td>
            <td><strong style="font-size:18px;color:#071126">Avantia Build</strong><br /><span style="font-size:13px;color:#64748b">Material request desk</span></td>
          </tr></table>
        </div>
        <div style="padding:24px 22px">
          <p style="margin:0 0 8px;color:#0071e3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${beatQuote ? "New quote to beat" : "New material request"}</p>
          <h1 style="margin:0;font-size:26px;line-height:1.2;color:#071126">${escapeHtml(fullName)} sent a request</h1>
          <p style="margin:10px 0 0;color:#475569">${escapeHtml(departmentText)}${input.timeframe ? ` &bull; Needed ${escapeHtml(input.timeframe)}` : ""}</p>
          <p style="margin:22px 0"><a href="${requestUrl}" style="display:inline-block;border-radius:8px;background:#0071e3;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open Request</a></p>
          <div style="padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">
            <strong>Reference:</strong> ${escapeHtml(input.referenceId)}<br />
            <strong>Customer:</strong> ${escapeHtml(fullName)}<br />
            <strong>Phone:</strong> ${escapeHtml(input.phone || "Not provided")}<br />
            <strong>Email:</strong> ${escapeHtml(input.email)}${input.company ? `<br /><strong>Company:</strong> ${escapeHtml(input.company)}` : ""}
          </div>
          <h2 style="margin:24px 0 8px;font-size:17px">Job details</h2>
          <p style="margin:0"><strong>Location:</strong> ${escapeHtml(address || "Not provided")}<br /><strong>Departments:</strong> ${escapeHtml(departmentText)}</p>
          <h2 style="margin:24px 0 8px;font-size:17px">What they need</h2>
          <p style="margin:0;white-space:pre-wrap">${escapeHtml(input.details || "See attached file")}</p>
          ${input.attachment?.filename ? `<p style="margin:20px 0 0;color:#475569;font-size:13px"><strong>Attached:</strong> ${escapeHtml(input.attachment.filename)}</p>` : ""}
        </div>
      </div>
    </div>
  `

  const owner = await sendEmail({
    apiKey,
    from,
    to,
    subject: `${beatQuote ? "NEW QUOTE TO BEAT" : "NEW MATERIAL REQUEST"} - ${fullName} - ${input.referenceId}`,
    html,
    text,
    replyTo: input.email,
    idempotencyKey: `avantia-intake-owner-${input.referenceId}`,
    attachments: input.attachment?.content ? [{ filename: input.attachment.filename, content: input.attachment.content }] : undefined,
  })

  const clientText = [
    `Hi ${input.firstName},`,
    "",
    beatQuote ? "We received the store quote you want us to beat." : "We received your Avantia Build quote request.",
    `Reference: ${input.referenceId}`,
    `Project: ${input.projectName || "Not named"}`,
    "",
    "Materials requested:",
    `Departments: ${departmentText}`,
    input.details || "See the attached file.",
    ...(input.attachment?.filename ? [`Attachment: ${input.attachment.filename}`] : []),
    "",
    "Our team will review the details and contact you if anything else is needed.",
    "",
    companyContactText(),
  ].join("\n")
  const clientRequestItems: CustomerEmailItem[] = [{
    name: departmentText,
    details: [input.details || "See the attached file."],
  }]
  const client = await sendEmail({
        apiKey,
        from,
        to: input.email,
        subject: `${beatQuote ? "Quote received" : "Material request received"} - ${input.referenceId}`,
        html: renderCustomerEmailShell(`
          <p style="margin:0 0 8px;color:#0066cc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Request received</p>
          <h1 style="margin:0;font-size:25px;line-height:1.25;color:#071126">Your request is in.</h1>
          <p style="margin:12px 0;color:#475569">Hi ${escapeHtml(input.firstName)}, we will review your details and contact you within 24 hours.</p>
          <div style="margin:20px 0;padding:15px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc">
            <strong>Reference:</strong> ${escapeHtml(input.referenceId)}
            ${input.projectName ? `<br /><strong>Project:</strong> ${escapeHtml(input.projectName)}` : ""}
          </div>
          <h2 style="margin:22px 0 0;font-size:17px;color:#071126">Materials requested</h2>
          ${renderRequestedItemsHtml(clientRequestItems)}
          ${input.attachment?.filename ? `<p style="margin:14px 0 0;color:#475569;font-size:13px"><strong>Attached:</strong> ${escapeHtml(input.attachment.filename)}</p>` : ""}
          <p style="margin:22px 0 0"><a href="${SITE_URL}" style="display:inline-block;border-radius:8px;background:#0071e3;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Open Avantia Build</a></p>
        `),
        text: clientText,
        replyTo: COMPANY_EMAIL,
        idempotencyKey: `avantia-intake-client-${input.referenceId}`,
      })

  if (owner.status === "sent" && client.status === "sent") return { owner, client }

  const fallback = await sendWithSupabaseEmailFallback("send_quote_notifications", {
    requestId: input.requestId,
    quote: { ...input, attachment: input.attachment ? { filename: input.attachment.filename } : undefined },
    sendOwner: owner.status !== "sent",
    sendClient: client.status !== "sent",
  })
  return {
    owner: owner.status === "sent" ? owner : fallback.owner ?? fallback.result ?? owner,
    client: client.status === "sent" ? client : fallback.client ?? fallback.result ?? client,
  }
}

export async function sendCartSubmissionEmail(input: CartSubmissionEmailInput): Promise<CartSubmissionEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    const fallback = await sendWithSupabaseEmailFallback("send_order_notifications", {
      order: input,
      sendOwner: true,
      sendClient: true,
    })
    const owner = fallback.owner ?? fallback.result ?? { status: "not_configured" as const }
    const client = fallback.client ?? fallback.result ?? { status: "not_configured" as const }
    return {
      status: owner.status === "sent" ? "sent" : owner.status === "failed" ? "failed" : "not_configured",
      providerId: owner.status === "sent" ? owner.providerId : null,
      owner,
      client,
    }
  }

  const to = DEFAULT_TO
  const from = DEFAULT_FROM
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
        replyTo: COMPANY_EMAIL,
        idempotencyKey: `avantia-order-client-${input.quoteId}`,
      })
    : { status: "skipped" as const }

  if (owner.status === "sent" && (client.status === "sent" || client.status === "skipped")) {
    return { status: "sent", providerId: owner.providerId, owner, client }
  }

  const fallback = await sendWithSupabaseEmailFallback("send_order_notifications", {
    order: input,
    sendOwner: owner.status !== "sent",
    sendClient: client.status !== "sent" && client.status !== "skipped",
  })
  const finalOwner = owner.status === "sent" ? owner : fallback.owner ?? fallback.result ?? owner
  const finalClient = client.status === "sent" || client.status === "skipped" ? client : fallback.client ?? fallback.result ?? client
  return {
    status: finalOwner.status === "sent" ? "sent" : finalOwner.status === "not_configured" ? "not_configured" : "failed",
    providerId: finalOwner.status === "sent" ? finalOwner.providerId : null,
    owner: finalOwner,
    client: finalClient,
  }
}

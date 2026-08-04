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

export type CartSubmissionEmailResult =
  | { status: "sent"; providerId: string | null }
  | { status: "not_configured" }
  | { status: "failed"; error: string }

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
    "New Avantia Build cart submission",
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
      <h1 style="margin:0 0 12px;font-size:22px">New Avantia Build cart submission</h1>
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

export async function sendCartSubmissionEmail(input: CartSubmissionEmailInput): Promise<CartSubmissionEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { status: "not_configured" }
  }

  const to = process.env.QUOTE_SUBMISSION_TO || DEFAULT_TO
  const from = process.env.QUOTE_SUBMISSION_FROM || DEFAULT_FROM
  const subject = `Avantia Build quote request: ${input.project.name}`
  const replyTo = input.customer.email || input.customer.profile?.email || undefined

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `avantia-cart-${input.quoteId}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: buildHtml(input),
        text: buildText(input),
        reply_to: replyTo,
      }),
    })

    const payload = (await response.json().catch(() => null)) as { id?: string; message?: string; error?: string } | null

    if (!response.ok) {
      return { status: "failed", error: payload?.message || payload?.error || `Resend returned ${response.status}` }
    }

    return { status: "sent", providerId: payload?.id ?? null }
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown email error" }
  }
}

export const REQUEST_PAYMENT_METHODS = ["credit_card", "ach", "check"] as const

export type RequestPaymentMethod = (typeof REQUEST_PAYMENT_METHODS)[number]

export type RequestClientPaymentRequest = {
  method: RequestPaymentMethod
  amountDue: number
  instructions: string
  securePaymentUrl?: string
}

const paymentMethodLabels: Record<RequestPaymentMethod, string> = {
  credit_card: "Credit card",
  ach: "ACH",
  check: "Check",
}

function looksLikeCardNumber(value: string) {
  const candidates = value.match(/(?:\d[ -]?){13,19}/g) ?? []
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "")
    if (digits.length < 13 || digits.length > 19) return false
    let sum = 0
    let double = false
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index])
      if (double) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      double = !double
    }
    return sum % 10 === 0
  })
}

export function containsRawPaymentCredentials(value: string) {
  const text = String(value || "")
  return looksLikeCardNumber(text)
    || /\b(?:cvv|cvc|security\s+code)\D{0,8}\d{3,4}\b/i.test(text)
    || /\b(?:routing|bank\s+account|account\s+(?:number|no\.?|#))\D{0,12}\d{6,17}\b/i.test(text)
}

export function hasForbiddenPaymentFields(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) return value.some(hasForbiddenPaymentFields)
  return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "")
    if (["ach", "cardnumber", "cvv", "cvc", "routingnumber", "accountnumber", "bankaccount"].includes(normalized)) return true
    return hasForbiddenPaymentFields(entry)
  })
}

export function containsRawPaymentCredentialsInPayload(value: unknown): boolean {
  if (typeof value === "string") return containsRawPaymentCredentials(value)
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && String(Math.abs(value)).length >= 13) return true
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) return value.some(containsRawPaymentCredentialsInPayload)
  return Object.values(value as Record<string, unknown>).some(containsRawPaymentCredentialsInPayload)
}

function secureHostedUrl(value: unknown) {
  const text = String(value || "").trim()
  if (!text) return { ok: true as const, value: undefined }
  if (text.length > 2_000) return { ok: false as const }
  try {
    const url = new URL(text)
    if (url.protocol !== "https:" || url.username || url.password) return { ok: false as const }
    return { ok: true as const, value: url.toString() }
  } catch {
    return { ok: false as const }
  }
}

export function parseHostedPaymentUrl(value: unknown) {
  const parsed = secureHostedUrl(value)
  return parsed.ok ? parsed.value : undefined
}

export function sanitizeRequestClientPayment(value: unknown):
  | { ok: true; value: RequestClientPaymentRequest }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value) || hasForbiddenPaymentFields(value)) {
    return { ok: false, error: "Payment requests cannot contain card or bank account details." }
  }
  const input = value as Record<string, unknown>
  const method = String(input.method || "") as RequestPaymentMethod
  if (!REQUEST_PAYMENT_METHODS.includes(method)) return { ok: false, error: "Choose credit card, ACH, or check." }
  const amountDue = Number(input.amountDue)
  if (!Number.isFinite(amountDue) || amountDue <= 0 || amountDue > 10_000_000) return { ok: false, error: "Enter a valid amount due." }
  const instructions = String(input.instructions || "").trim().slice(0, 500)
  if (containsRawPaymentCredentials(instructions)) return { ok: false, error: "Remove card or bank account details from the instructions." }
  if (containsRawPaymentCredentials(String(input.securePaymentUrl || ""))) return { ok: false, error: "The hosted payment URL cannot contain card or bank account details." }
  const paymentUrl = secureHostedUrl(input.securePaymentUrl)
  if (!paymentUrl.ok) return { ok: false, error: "Use a valid HTTPS hosted payment URL or leave it blank." }
  return {
    ok: true,
    value: {
      method,
      amountDue: Math.round(amountDue * 100) / 100,
      instructions,
      ...(paymentUrl.value ? { securePaymentUrl: paymentUrl.value } : {}),
    },
  }
}

export function parseStoredRequestClientPayment(value: unknown) {
  const parsed = sanitizeRequestClientPayment(value)
  return parsed.ok ? parsed.value : undefined
}

export function requestPaymentMethodLabel(method: RequestPaymentMethod) {
  return paymentMethodLabels[method]
}

export function requestPaymentGuidance(payment: Pick<RequestClientPaymentRequest, "method" | "securePaymentUrl">) {
  if (payment.securePaymentUrl) return "Use the secure hosted payment page below. Do not send payment details by email or text."
  if (payment.method === "ach") return "Call or text Avantia Build at (516) 908-8319 to coordinate secure ACH payment. Never send routing or account details by email or text."
  if (payment.method === "check") return "Call or text Avantia Build at (516) 908-8319 to coordinate check delivery or mailing instructions."
  return "Call or text Avantia Build at (516) 908-8319 to coordinate card payment. Never send a card number or security code by email or text."
}

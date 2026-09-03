import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/identity"

export const AVANTIA_QUO_CALLER_ID = "+15169088319"

export type CommunicationThreadIdentity = {
  key: string
  phone: string | null
  email: string | null
}

export function normalizeCommunicationCallPhone(value: unknown) {
  return normalizeAuraPhone(value)
}

export function communicationTelHref(value: unknown) {
  const phone = normalizeCommunicationCallPhone(value)
  return phone ? `tel:${phone}` : null
}

export function communicationQuoCallHref(value: unknown, userAgent: string) {
  const phone = normalizeCommunicationCallPhone(value)
  if (!phone) return null
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
    const parameters = new URLSearchParams({
      number: phone,
      from: AVANTIA_QUO_CALLER_ID,
    })
    return `openphone://dial?${parameters.toString()}`
  }
  return communicationTelHref(phone)
}

export function normalizeCommunicationThread(value: unknown): CommunicationThreadIdentity | null {
  const raw = typeof value === "string" ? value.trim() : ""
  const phone = normalizeAuraPhone(raw)
  if (phone) return { key: phone, phone, email: null }
  const email = normalizeAuraEmail(raw)
  if (email) return { key: email, phone: null, email }
  return null
}

export function communicationThreadHref(value: unknown, channel = "all") {
  const identity = normalizeCommunicationThread(value)
  if (!identity) return null
  const parameters = new URLSearchParams({ thread: identity.key })
  if (["call", "sms", "whatsapp", "email"].includes(channel)) parameters.set("channel", channel)
  return `/admin/communications?${parameters.toString()}`
}

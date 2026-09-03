import { normalizeAuraPhone } from "@/lib/aura/identity"

export function normalizeCommunicationCallPhone(value: unknown) {
  return normalizeAuraPhone(value)
}

export function communicationTelHref(value: unknown) {
  const phone = normalizeCommunicationCallPhone(value)
  return phone ? `tel:${phone}` : null
}

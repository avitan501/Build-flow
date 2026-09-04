export function normalizeOutreachLeadEmail(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeOutreachLeadPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
}

export function buildQuickLeadNotes(input: {
  source: string
  followUpDate: string
  note: string
  rawText: string
}) {
  return [
    input.source ? `Source: ${input.source}` : "",
    input.followUpDate ? `Follow-up: ${input.followUpDate}` : "",
    input.note ? `Note: ${input.note}` : "",
    input.rawText ? `Raw intake:\n${input.rawText}` : "",
  ].filter(Boolean).join("\n\n").slice(0, 1000)
}

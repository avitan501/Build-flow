export const CREDIT_CARD_PROCESSING_TERM = "A 3% processing fee applies to credit card payments."

export const DEFAULT_PROPOSAL_TERMS = [
  "Prices may change until the order is approved and processed.",
  CREDIT_CARD_PROCESSING_TERM,
  "All sales are final unless stated otherwise.",
  "Delivery, taxes, and freight are included only when shown above.",
].join(" ")

export function includeCreditCardProcessingTerm(terms: string) {
  const cleanTerms = terms.trim()
  if (/3% processing fee applies to credit card payments/i.test(cleanTerms)) return cleanTerms
  return [cleanTerms, CREDIT_CARD_PROCESSING_TERM].filter(Boolean).join(" ")
}

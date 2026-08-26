export const CREDIT_CARD_PROCESSING_TERM = "Credit card payments may be subject to a processing fee of up to 3%, not to exceed Avantia's actual processing cost. Any applicable credit-card total will be disclosed before payment, unless different payment terms are agreed in writing."

export const DEFAULT_PROPOSAL_TERMS = [
  "Prices may change until the order is approved and processed.",
  CREDIT_CARD_PROCESSING_TERM,
  "All sales are final unless stated otherwise.",
  "Delivery, taxes, and freight are included only when shown above.",
].join(" ")

export function includeCreditCardProcessingTerm(terms: string) {
  const cleanTerms = terms.trim()
  if (/credit[- ]card payments may be subject to a processing fee of up to 3%/i.test(cleanTerms)) return cleanTerms
  return [cleanTerms, CREDIT_CARD_PROCESSING_TERM].filter(Boolean).join(" ")
}

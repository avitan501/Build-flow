export const CREDIT_CARD_PROCESSING_TERM = "A 3% processing fee applies to credit card payments."

export const RESTOCKING_TERM = "Approved returns may be subject to a restocking fee of up to 25% of the returned merchandise price, plus disclosed pickup, return-freight, or supplier charges. Returns require prior written authorization and remain subject to the applicable supplier return policy."

export const PAYMENT_DISPUTE_TERM = "Before requesting a stop-payment, reversal, or chargeback, the customer agrees to contact Avantia promptly and allow a reasonable opportunity to investigate and resolve the issue. This does not waive any billing-error, dispute, or other right that cannot legally be waived."

export const REQUIRED_PROPOSAL_TERMS = [
  CREDIT_CARD_PROCESSING_TERM,
  RESTOCKING_TERM,
  PAYMENT_DISPUTE_TERM,
]

export const DEFAULT_PROPOSAL_TERMS = [
  "Please confirm the items, quantities, and delivery details above are correct.",
  "Prices and availability may change until the order is processed.",
  "All sales are final unless stated otherwise.",
  "Taxes, delivery, and freight apply only when shown.",
  CREDIT_CARD_PROCESSING_TERM,
  "Approved returns may be subject to a restocking fee of up to 25% plus disclosed return, pickup, or freight costs.",
  "Before requesting a stop-payment, reversal, or chargeback, please contact Avantia so we can help. Your legal rights remain unchanged.",
].join(" ")

const LEGACY_DEFAULT_PROPOSAL_TERMS = [
  "Prices may change until the order is approved and processed.",
  "All sales are final unless stated otherwise.",
  "Delivery, taxes, and freight are included only when shown above.",
  ...REQUIRED_PROPOSAL_TERMS,
].join(" ")

export function includeRequiredProposalTerms(terms: string) {
  let result = terms.trim()
  const requiredTerms = [
    { pattern: /3% processing fee applies to credit card payments/i, text: CREDIT_CARD_PROCESSING_TERM },
    { pattern: /restocking fee of up to 25%/i, text: RESTOCKING_TERM },
    { pattern: /before requesting a stop-payment, reversal, or chargeback/i, text: PAYMENT_DISPUTE_TERM },
  ]

  for (const term of requiredTerms) {
    if (!term.pattern.test(result)) result = [result, term.text].filter(Boolean).join(" ")
  }
  return result
}

export function proposalTermsForEditor(terms?: string | null) {
  const savedTerms = String(terms || "").trim()
  if (!savedTerms) return DEFAULT_PROPOSAL_TERMS
  const normalizedSavedTerms = savedTerms.replace(/\s+/g, " ")
  if (normalizedSavedTerms === LEGACY_DEFAULT_PROPOSAL_TERMS) return DEFAULT_PROPOSAL_TERMS
  return includeRequiredProposalTerms(savedTerms)
}

// Retained for older callers while enforcing every required shared term.
export function includeCreditCardProcessingTerm(terms: string) {
  return includeRequiredProposalTerms(terms)
}

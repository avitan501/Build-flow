import "server-only"

import { createHash } from "node:crypto"

import { includeRequiredProposalTerms } from "@/lib/proposal-terms"

// Bump this identifier whenever shared legal wording changes. The exact text is
// also hashed and snapshotted with every acknowledgement.
export const CLIENT_DOCUMENT_TERMS_VERSION = "avantia-client-document-terms-v2"

export function clientDocumentTerms(terms: string) {
  return includeRequiredProposalTerms(terms).replace(/\r\n?/g, "\n").trim()
}

export function clientDocumentTermsHash(termsText: string) {
  return createHash("sha256").update(termsText, "utf8").digest("hex")
}

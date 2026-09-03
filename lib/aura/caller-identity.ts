import { normalizeAuraPhone } from "@/lib/aura/identity"

export type CallerIdentityKind = "customer" | "lead" | "supplier" | "contact"

export type CallerIdentityCandidate = {
  canonicalKey: string
  id: string
  kind: CallerIdentityKind
  name: string
  company?: string | null
  phone?: string | null
  source?: "directory" | "contact-link" | "communication-link"
}

export type CallerIdentityResolution = {
  phone: string
  status: "verified" | "ambiguous" | "unknown"
  primary: CallerIdentityCandidate | null
  candidates: CallerIdentityCandidate[]
}

const kindPriority: Record<CallerIdentityKind, number> = {
  customer: 0,
  lead: 1,
  supplier: 2,
  contact: 3,
}

const sourcePriority: Record<NonNullable<CallerIdentityCandidate["source"]>, number> = {
  directory: 0,
  "contact-link": 1,
  "communication-link": 2,
}

function clean(value?: string | null) {
  return String(value || "").trim()
}

function isVerifiedIdentityLabel(value: string, phone: string) {
  return Boolean(value)
    && !/^unnamed\b|^unknown\b|^phone ending\b/i.test(value)
    && !value.includes("@")
    && normalizeAuraPhone(value) !== phone
}

function verifiedCandidate(candidate: CallerIdentityCandidate, phone: string): CallerIdentityCandidate | null {
  const name = clean(candidate.name)
  const company = clean(candidate.company)
  const verifiedName = isVerifiedIdentityLabel(name, phone) ? name : ""
  const verifiedCompany = isVerifiedIdentityLabel(company, phone) ? company : ""
  if (!verifiedName && !verifiedCompany) return null
  return { ...candidate, name: verifiedName || verifiedCompany, company: verifiedCompany }
}

function compareCandidates(left: CallerIdentityCandidate, right: CallerIdentityCandidate) {
  return kindPriority[left.kind] - kindPriority[right.kind]
    || sourcePriority[left.source || "directory"] - sourcePriority[right.source || "directory"]
    || clean(left.name).localeCompare(clean(right.name), "en", { sensitivity: "base" })
    || clean(left.company).localeCompare(clean(right.company), "en", { sensitivity: "base" })
    || left.canonicalKey.localeCompare(right.canonicalKey)
    || left.id.localeCompare(right.id)
}

/**
 * Resolves only an exact E.164 phone match. Candidates sharing a canonical key
 * represent the same linked record and are collapsed; distinct records remain
 * visible as an ambiguity instead of silently selecting the first match.
 */
export function resolveCallerIdentity(
  phoneValue: string | null | undefined,
  candidates: CallerIdentityCandidate[],
): CallerIdentityResolution {
  const phone = normalizeAuraPhone(phoneValue)
  if (!phone) return { phone: "", status: "unknown", primary: null, candidates: [] }

  const exact = candidates
    .filter((candidate) => normalizeAuraPhone(candidate.phone) === phone)
    .map((candidate) => verifiedCandidate(candidate, phone))
    .filter((candidate): candidate is CallerIdentityCandidate => candidate !== null)
    .sort(compareCandidates)
  const canonical = [...new Map(exact.map((candidate) => [candidate.canonicalKey, candidate])).values()]

  if (!canonical.length) return { phone, status: "unknown", primary: null, candidates: [] }
  if (canonical.length === 1) return { phone, status: "verified", primary: canonical[0], candidates: canonical }
  return { phone, status: "ambiguous", primary: canonical[0], candidates: canonical }
}

export function callerIdentityKindLabel(kind: CallerIdentityKind) {
  if (kind === "supplier") return "Supplier / Vendor"
  return kind[0].toUpperCase() + kind.slice(1)
}

export function callerIdentityCandidateLabel(candidate: CallerIdentityCandidate) {
  const company = clean(candidate.company)
  const name = clean(candidate.name)
  const identity = company && company !== name ? `${name} · ${company}` : name || company
  return `${identity} (${callerIdentityKindLabel(candidate.kind)})`
}

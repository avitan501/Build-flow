export const LEAD_DISCOVERY_LIMIT = 50

export const LEAD_DEPARTMENTS = [
  { value: 1, label: "Contractors", discoverable: true },
  { value: 2, label: "Building owners", discoverable: true },
  { value: 3, label: "Designers", discoverable: true },
  { value: 4, label: "Inbound", discoverable: false },
  { value: 5, label: "Manually added", discoverable: false },
] as const

export type LeadDepartment = 1 | 2 | 3 | 4 | 5

export type LeadDiscoverySource = {
  title?: unknown
  url?: unknown
  text?: unknown
  highlights?: unknown
}

export type LeadDiscoveryCandidate = {
  companyName: string
  email: string | null
  phone: string | null
  sourceUrl: string
  sourceDomain: string
}

export type LeadDiscoveryPreview = LeadDiscoveryCandidate & {
  category: string
  location: string
  website: string | null
  matchExplanation: string
  verificationStatus: "verified-public-source" | "needs-contact-enrichment"
}

export type StructuredLeadDiscoverySource = LeadDiscoverySource & {
  category?: unknown
  location?: unknown
  website?: unknown
  matchExplanation?: unknown
  verificationStatus?: unknown
}

const blockedDomains = new Set([
  "angi.com",
  "bbb.org",
  "facebook.com",
  "houzz.com",
  "instagram.com",
  "linkedin.com",
  "mapquest.com",
  "thumbtack.com",
  "x.com",
  "yelp.com",
  "yellowpages.com",
])

function clean(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximum)
    : ""
}

function safeSource(value: unknown) {
  try {
    const url = new URL(clean(value, 1600))
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
    if (url.protocol !== "https:" || url.username || url.password) return null
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) return null
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return null
    if ([...blockedDomains].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return null
    url.hash = ""
    return { url: url.toString(), domain: hostname }
  } catch {
    return null
  }
}

function companyName(titleValue: unknown, domain: string) {
  const generic = /^(?:about|contact|contact us|home|homepage|official site|services)$/i
  const title = clean(titleValue, 240)
  const segments = title.split(/[|–—]/).map((part) => part.trim()).filter(Boolean)
  const selected = segments.find((part) => !generic.test(part)) || ""
  const cleaned = selected
    .replace(/\b(?:contact us|official site|homepage)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (cleaned.length >= 2 && /[a-z0-9]/i.test(cleaned)) return cleaned.slice(0, 160)
  return domain
    .split(".")[0]
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 160)
}

function sourceIdentity(sourceUrl: string, domain: string) {
  if (domain !== "openstreetmap.org") return domain
  try {
    return `${domain}${new URL(sourceUrl).pathname}`
  } catch {
    return domain
  }
}

function publicEmail(text: string) {
  const match = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
  if (!match) return null
  const email = match[0].toLowerCase().slice(0, 320)
  return /\.(?:png|jpg|jpeg|gif|webp)$/i.test(email) ? null : email
}

function publicUsPhone(text: string) {
  const match = text.match(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/)
  if (!match) return null
  const digits = match[0].replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return null
}

export function leadDepartmentLabel(value: number) {
  return LEAD_DEPARTMENTS.find((department) => department.value === value)?.label ?? "Manually added"
}

export function effectiveLeadDepartment(input: { relationship_level: number; notes?: string | null }): LeadDepartment {
  const saved = Number(input.relationship_level)
  if (saved === 1 && /(?:source:\s*homepage|website send text|added from communications)/i.test(input.notes || "")) return 4
  if (saved === 1 && /lead screenshot source:/i.test(input.notes || "")) return 5
  return saved >= 1 && saved <= 5 ? saved as LeadDepartment : 5
}

export function selectLeadDiscoveryCandidates(input: {
  sources: LeadDiscoverySource[]
  existingEmails?: Iterable<string>
  existingPhones?: Iterable<string>
  existingDomains?: Iterable<string>
  limit?: number
}) {
  const emails = new Set(Array.from(input.existingEmails ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean))
  const phones = new Set(Array.from(input.existingPhones ?? []).map((value) => value.replace(/\D/g, "")).filter(Boolean))
  const domains = new Set(Array.from(input.existingDomains ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean))
  const limit = Math.max(0, Math.min(input.limit ?? LEAD_DISCOVERY_LIMIT, LEAD_DISCOVERY_LIMIT))
  const candidates: LeadDiscoveryCandidate[] = []

  for (const source of input.sources) {
    const safe = safeSource(source.url)
    if (!safe) continue
    const sourceKey = sourceIdentity(safe.url, safe.domain)
    if (domains.has(sourceKey)) continue
    const highlights = Array.isArray(source.highlights) ? source.highlights.map((value) => clean(value, 1600)).join(" ") : ""
    const sourceText = `${highlights} ${clean(source.text, 5000)}`.trim()
    const email = publicEmail(sourceText)
    const phone = publicUsPhone(sourceText)
    if (!email && !phone) continue
    const phoneKey = phone?.replace(/\D/g, "") || ""
    if ((email && emails.has(email)) || (phoneKey && phones.has(phoneKey))) continue

    candidates.push({
      companyName: companyName(source.title, safe.domain),
      email,
      phone,
      sourceUrl: safe.url,
      sourceDomain: safe.domain,
    })
    domains.add(sourceKey)
    if (email) emails.add(email)
    if (phoneKey) phones.add(phoneKey)
    if (candidates.length === limit) break
  }

  return candidates
}

export function selectLeadDiscoveryPreviews(input: {
  sources: StructuredLeadDiscoverySource[]
  existingEmails?: Iterable<string>
  existingPhones?: Iterable<string>
  existingDomains?: Iterable<string>
  limit?: number
}) {
  const candidates = selectLeadDiscoveryCandidates(input)
  const sourceByUrl = new Map(
    input.sources.flatMap((source) => {
      const safe = safeSource(source.url)
      return safe ? [[safe.url, source] as const] : []
    }),
  )
  return candidates.map<LeadDiscoveryPreview>((candidate) => {
    const source = sourceByUrl.get(candidate.sourceUrl)
    const website = safeSource(source?.website)?.url ?? candidate.sourceUrl
    return {
      ...candidate,
      category: clean(source?.category, 100) || "Business",
      location: clean(source?.location, 160),
      website,
      matchExplanation: clean(source?.matchExplanation, 360) || "Matched from a verified public business source.",
      verificationStatus: candidate.email || candidate.phone ? "verified-public-source" : "needs-contact-enrichment",
    }
  })
}

import { NextResponse } from "next/server"
import { z } from "zod"

import { createDiscoveryCandidateToken, createDiscoveryFallbackToken, verifyDiscoveryFallbackToken } from "@/lib/discovery-fallback"
import {
  LEAD_DISCOVERY_LIMIT,
  leadDepartmentLabel,
  selectLeadDiscoveryPreviews,
  type LeadDepartment,
  type StructuredLeadDiscoverySource,
} from "@/lib/lead-discovery"
import { requestOpenClawJob, type OpenClawSearchResult } from "@/lib/openclaw-job-client"
import { getOwnerAccessSession } from "@/lib/owner-access"
import type { ShopQualificationSettings } from "@/lib/shop-qualification"

export const maxDuration = 120

const inputSchema = z.object({
  department: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  zipCode: z.string().regex(/^\d{5}$/),
  provider: z.enum(["primary", "exa"]).default("primary"),
  exaApprovalToken: z.string().max(2_000).optional(),
})

type ExistingLead = { email: string | null; phone: string | null; notes: string | null }
type ExistingCustomer = { email: string | null; phone: string | null }

function sourceIdentities(urls: Array<string | null | undefined>) {
  return urls.flatMap((value) => {
    if (!value) return []
    try { return [new URL(value).hostname.toLowerCase().replace(/^www\./, "")] } catch { return [] }
  })
}

function existingLeadSourceIdentities(leads: ExistingLead[]) {
  return sourceIdentities(leads.map((lead) => lead.notes?.match(/Source:\s+(https:\/\/\S+)/i)?.[1]))
}

function structuredSource(result: OpenClawSearchResult): StructuredLeadDiscoverySource {
  return {
    title: result.company || result.name,
    url: result.sourceUrl,
    text: [result.verifiedPublicEmail, result.verifiedPublicPhone].filter(Boolean).join(" "),
    category: result.category,
    location: result.location,
    website: result.website,
    matchExplanation: result.matchExplanation,
    verificationStatus: result.verificationStatus,
  }
}

async function searchWithExa(input: { apiKey: string; department: LeadDepartment; zipCode: string }) {
  const label = leadDepartmentLabel(input.department)
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": input.apiKey },
    body: JSON.stringify({
      query: `${label} serving ZIP ${input.zipCode}. Return official business contact pages only, not directories, maps, social profiles, or articles.`,
      type: "deep-lite",
      numResults: LEAD_DISCOVERY_LIMIT,
      contents: { highlights: { query: "official company name location public business email phone website services", maxCharacters: 1_200 }, maxAgeHours: 0 },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) throw new Error("lead_discovery_exa_failed")
  const payload = await response.json() as { results?: Array<{ title?: string; url?: string; text?: string; highlights?: string[] }> }
  return (payload.results ?? []).map((result): StructuredLeadDiscoverySource => ({
    title: result.title,
    url: result.url,
    text: [...(result.highlights ?? []), result.text ?? ""].join(" "),
    category: label,
    location: `ZIP ${input.zipCode}`,
    website: result.url,
    matchExplanation: `Exa fallback matched this public business page to ${label} near ${input.zipCode}.`,
    verificationStatus: "verified-public-source",
  }))
}

export async function POST(request: Request) {
  const auth = await getOwnerAccessSession()
  if (!auth.user || !auth.supabase) return NextResponse.json({ ok: false, error: "Owner sign-in is required." }, { status: 401 })
  if (!auth.isOwner) return NextResponse.json({ ok: false, error: "Only David can run Find Leads." }, { status: 403 })

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a valid five-digit ZIP code." }, { status: 400 })
  const departmentLabel = leadDepartmentLabel(parsed.data.department)
  const fallbackIdentity = { userId: auth.user.id, job: "find_leads" as const, department: departmentLabel, zipCode: parsed.data.zipCode }

  try {
    const [existingResult, customersResult, supplierResult] = await Promise.all([
      auth.supabase.from("manager_outreach_leads").select("email,phone,notes").limit(5_000).returns<ExistingLead[]>(),
      auth.supabase.from("profiles").select("email,phone").limit(5_000).returns<ExistingCustomer[]>(),
      auth.supabase.rpc("staff_load_supplier_directory_snapshot"),
    ])
    if (existingResult.error || customersResult.error || supplierResult.error) throw existingResult.error || customersResult.error || supplierResult.error
    const suppliers = ((supplierResult.data as { settings?: ShopQualificationSettings } | null)?.settings?.suppliers ?? [])
    const existing = existingResult.data ?? []
    const customers = customersResult.data ?? []

    let provider: "codex_openclaw" | "exa_fallback"
    let sources: StructuredLeadDiscoverySource[]
    let fallbackAvailable = false
    let fallbackReason: string | undefined

    if (parsed.data.provider === "exa") {
      if (!parsed.data.exaApprovalToken || !verifyDiscoveryFallbackToken(parsed.data.exaApprovalToken, fallbackIdentity)) {
        return NextResponse.json({ ok: false, error: "Run the low-cost search first, then approve Exa if it is needed." }, { status: 400 })
      }
      const apiKey = process.env.EXA_API_KEY?.trim()
      if (!apiKey) return NextResponse.json({ ok: false, error: "Exa fallback is not configured." }, { status: 503 })
      sources = await searchWithExa({ apiKey, department: parsed.data.department, zipCode: parsed.data.zipCode })
      provider = "exa_fallback"
    } else {
      const primary = await requestOpenClawJob({ job: "find_leads", department: departmentLabel, zipCode: parsed.data.zipCode, limit: LEAD_DISCOVERY_LIMIT })
      if (!primary.ok) {
        return NextResponse.json({
          ok: false,
          error: primary.error || "OpenClaw search is unavailable.",
          code: primary.code,
          provider: "codex_openclaw",
          fallbackAvailable: primary.fallbackAvailable,
          exaApprovalToken: primary.fallbackAvailable ? createDiscoveryFallbackToken(fallbackIdentity) : undefined,
          exaMayIncurCharge: primary.fallbackAvailable,
        }, { status: 503 })
      }
      sources = primary.results.map(structuredSource)
      provider = "codex_openclaw"
      fallbackAvailable = primary.fallbackAvailable
      fallbackReason = primary.partial ? "The low-cost search found fewer than 50 verified public contacts." : undefined
    }

    const supplierEmails = suppliers.flatMap((supplier) => [supplier.email, ...(supplier.additionalContacts ?? []).map((contact) => contact.email)].filter(Boolean) as string[])
    const supplierPhones = suppliers.flatMap((supplier) => [supplier.phone, supplier.whatsapp, ...(supplier.additionalContacts ?? []).map((contact) => contact.phone)].filter(Boolean) as string[])
    const candidates = selectLeadDiscoveryPreviews({
      sources,
      existingEmails: [...existing.flatMap((lead) => lead.email ? [lead.email] : []), ...customers.flatMap((customer) => customer.email ? [customer.email] : []), ...supplierEmails],
      existingPhones: [...existing.flatMap((lead) => lead.phone ? [lead.phone] : []), ...customers.flatMap((customer) => customer.phone ? [customer.phone] : []), ...supplierPhones],
      existingDomains: [...existingLeadSourceIdentities(existing), ...sourceIdentities(suppliers.map((supplier) => supplier.portalUrl))],
    })
    const reviewCandidates = candidates.map((candidate) => ({
      ...candidate,
      approvalToken: createDiscoveryCandidateToken({ userId: auth.user.id, ...candidate, department: parsed.data.department, zipCode: parsed.data.zipCode, provider }),
    }))
    fallbackAvailable ||= provider === "codex_openclaw" && candidates.length < Math.min(10, LEAD_DISCOVERY_LIMIT)
    console.info("[lead-discovery] completed", { provider, department: parsed.data.department, count: candidates.length })
    return NextResponse.json({
      ok: true,
      candidates: reviewCandidates,
      count: reviewCandidates.length,
      requested: LEAD_DISCOVERY_LIMIT,
      partial: candidates.length < LEAD_DISCOVERY_LIMIT,
      provider,
      fallbackAvailable,
      fallbackReason,
      exaApprovalToken: fallbackAvailable ? createDiscoveryFallbackToken(fallbackIdentity) : undefined,
      exaMayIncurCharge: fallbackAvailable,
      saved: 0,
    })
  } catch (error) {
    console.error("[lead-discovery] failed", { provider: parsed.data.provider === "exa" ? "exa_fallback" : "codex_openclaw", error: error instanceof Error ? error.message : "unknown" })
    if (parsed.data.provider === "primary") {
      return NextResponse.json({ ok: false, error: "OpenClaw search is unavailable. You can approve Exa as a paid fallback.", provider: "codex_openclaw", fallbackAvailable: true, exaApprovalToken: createDiscoveryFallbackToken(fallbackIdentity), exaMayIncurCharge: true }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: "Lead search is temporarily unavailable." }, { status: 503 })
  }
}

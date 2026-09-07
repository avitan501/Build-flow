import { NextResponse } from "next/server"
import { z } from "zod"

import { requireStaffProfile } from "@/lib/auth"
import {
  LEAD_DISCOVERY_LIMIT,
  leadDepartmentLabel,
  selectLeadDiscoveryCandidates,
  type LeadDiscoverySource,
  type LeadDepartment,
} from "@/lib/lead-discovery"

const inputSchema = z.object({
  department: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  zipCode: z.string().regex(/^\d{5}$/),
})

type ExistingLead = {
  email: string | null
  phone: string | null
  notes: string | null
}

function existingSourceDomains(leads: ExistingLead[]) {
  return leads.flatMap((lead) => {
    const match = lead.notes?.match(/Source:\s+(https:\/\/\S+)/i)
    if (!match) return []
    try {
      return [new URL(match[1]).hostname.toLowerCase().replace(/^www\./, "")]
    } catch {
      return []
    }
  })
}

function discoveryQuery(department: LeadDepartment, zipCode: string) {
  if (department === 1) return `General contractors, remodeling contractors, and construction companies serving ZIP code ${zipCode}`
  if (department === 2) return `Commercial building owners, property management companies, and real estate development companies serving ZIP code ${zipCode}`
  return `Architecture firms, interior designers, and construction design firms serving ZIP code ${zipCode}`
}

async function searchExa(apiKey: string, department: LeadDepartment, zipCode: string) {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      query: `${discoveryQuery(department, zipCode)}. Return official business contact or company pages with a public business phone number or email. Exclude directories, social networks, articles, and private individuals.`,
      type: "deep-lite",
      numResults: 100,
      contents: {
        text: { maxCharacters: 5000 },
        highlights: { query: "company name business phone email contact services and service area", maxCharacters: 2400 },
        maxAgeHours: 0,
      },
    }),
  })
  if (!response.ok) throw new Error(`exa_${response.status}`)
  const payload = await response.json() as { results?: LeadDiscoverySource[] }
  return payload.results ?? []
}

function overpassFilters(department: LeadDepartment) {
  if (department === 1) {
    return [
      '["craft"~"builder|carpenter|electrician|floorer|hvac|painter|plumber|roofer|stonemason|tiler",i]',
      '["office"~"construction|contractor",i]',
    ]
  }
  if (department === 2) {
    return [
      '["office"~"property_management|estate_agent|real_estate|developer",i]',
    ]
  }
  return [
    '["office"~"architect|interior_design|landscape_architect",i]',
    '["craft"~"interior_decoration|interior_design",i]',
  ]
}

async function searchOpenStreetMap(department: LeadDepartment, zipCode: string) {
  const placeResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`, {
    headers: { "User-Agent": "AvantiaBuildLeadDirectory/1.0 (https://avantiabuild.com)" },
    signal: AbortSignal.timeout(12_000),
  })
  if (!placeResponse.ok) throw new Error("zip_lookup_failed")
  const placePayload = await placeResponse.json() as { places?: Array<{ latitude?: string; longitude?: string }> }
  const latitude = Number(placePayload.places?.[0]?.latitude)
  const longitude = Number(placePayload.places?.[0]?.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("zip_coordinates_missing")

  const bounds = [latitude - 0.145, longitude - 0.19, latitude + 0.145, longitude + 0.19]
    .map((value) => value.toFixed(5))
    .join(",")
  const clauses = overpassFilters(department)
    .map((filter) => `nwr(${bounds})${filter};`)
    .join("\n")
  const query = `[out:json][timeout:25];(\n${clauses}\n);out tags 200;`
  let response: Response | null = null
  for (const endpoint of ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"]) {
    try {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "AvantiaBuildLeadDirectory/1.0 (https://avantiabuild.com)",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(38_000),
      })
      if (result.ok) {
        response = result
        break
      }
    } catch {
      // Try the second public OpenStreetMap endpoint.
    }
  }
  if (!response) throw new Error("openstreetmap_unavailable")
  const payload = await response.json() as {
    elements?: Array<{
      id?: number
      type?: "node" | "way" | "relation"
      tags?: Record<string, string>
    }>
  }
  return (payload.elements ?? []).flatMap((element): LeadDiscoverySource[] => {
    const tags = element.tags ?? {}
    const name = tags.name || tags.operator || tags.brand
    const phone = tags["contact:phone"] || tags.phone
    const email = tags["contact:email"] || tags.email
    if (!name || (!phone && !email) || !element.id || !element.type) return []
    return [{
      title: name,
      url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      text: [phone, email, tags.website || tags["contact:website"]].filter(Boolean).join(" "),
    }]
  })
}

export async function POST(request: Request) {
  let auth: Awaited<ReturnType<typeof requireStaffProfile>>
  try {
    auth = await requireStaffProfile("customers")
  } catch {
    return NextResponse.json({ ok: false, error: "Manager sign-in is required." }, { status: 401 })
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a valid five-digit ZIP code." }, { status: 400 })
  try {
    const { data: existing, error: existingError } = await auth.supabase
      .from("manager_outreach_leads")
      .select("email,phone,notes")
      .limit(5000)
      .returns<ExistingLead[]>()
    if (existingError) throw existingError

    const sources = process.env.EXA_API_KEY
      ? await searchExa(process.env.EXA_API_KEY, parsed.data.department, parsed.data.zipCode)
      : await searchOpenStreetMap(parsed.data.department, parsed.data.zipCode)
    const candidates = selectLeadDiscoveryCandidates({
      sources,
      existingEmails: (existing ?? []).flatMap((lead) => lead.email ? [lead.email] : []),
      existingPhones: (existing ?? []).flatMap((lead) => lead.phone ? [lead.phone] : []),
      existingDomains: existingSourceDomains(existing ?? []),
    })
    if (!candidates.length) {
      return NextResponse.json({ ok: true, added: 0, requested: LEAD_DISCOVERY_LIMIT, partial: true })
    }

    const department = leadDepartmentLabel(parsed.data.department)
    const { error: insertError } = await auth.supabase.from("manager_outreach_leads").insert(candidates.map((lead) => ({
      full_name: lead.companyName,
      company_name: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      notes: `Generated lead · ${department} · ZIP ${parsed.data.zipCode} · Source: ${lead.sourceUrl}`.slice(0, 1000),
      status: "new",
      relationship_level: parsed.data.department,
      preferred_language: "en",
      created_by: auth.user.id,
    })))
    if (insertError) throw insertError

    return NextResponse.json({
      ok: true,
      added: candidates.length,
      requested: LEAD_DISCOVERY_LIMIT,
      partial: candidates.length < LEAD_DISCOVERY_LIMIT,
    })
  } catch (error) {
    console.error("Lead generation failed", error)
    return NextResponse.json({ ok: false, error: "Lead search is temporarily unavailable." }, { status: 503 })
  }
}

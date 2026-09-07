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

function existingSourceIdentities(leads: ExistingLead[]) {
  return leads.flatMap((lead) => {
    const match = lead.notes?.match(/Source:\s+(https:\/\/\S+)/i)
    if (!match) return []
    try {
      const url = new URL(match[1])
      const domain = url.hostname.toLowerCase().replace(/^www\./, "")
      return [domain === "openstreetmap.org" ? `${domain}${url.pathname}` : domain]
    } catch {
      return []
    }
  })
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
      '["office"~"property_management|developer",i]',
    ]
  }
  return [
    '["office"~"architect|interior_design|landscape_architect",i]',
    '["craft"~"interior_decoration|interior_design",i]',
  ]
}

async function searchOpenStreetMap(department: LeadDepartment, zipCode: string) {
  const placeResponse = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=United%20States&format=jsonv2&limit=1`, {
    headers: { "User-Agent": "AvantiaBuildLeadDirectory/1.0 (https://avantiabuild.com)" },
    signal: AbortSignal.timeout(12_000),
  })
  if (!placeResponse.ok) throw new Error("zip_lookup_failed")
  const placePayload = await placeResponse.json() as Array<{ boundingbox?: string[]; type?: string }>
  const bounds = placePayload[0]?.boundingbox?.map(Number)
  if (placePayload[0]?.type !== "postcode" || bounds?.length !== 4 || bounds.some((value) => !Number.isFinite(value))) {
    throw new Error("zip_bounds_missing")
  }
  const [south, north, west, east] = bounds
  const overpassBounds = [south, west, north, east].map((value) => value.toFixed(6)).join(",")
  const clauses = overpassFilters(department)
    .map((filter) => `nwr(${overpassBounds})${filter};`)
    .join("\n")
  const query = `[out:json][timeout:20];(\n${clauses}\n);out tags center 200;`
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
        signal: AbortSignal.timeout(28_000),
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

    const sources = await searchOpenStreetMap(parsed.data.department, parsed.data.zipCode)
    const candidates = selectLeadDiscoveryCandidates({
      sources,
      existingEmails: (existing ?? []).flatMap((lead) => lead.email ? [lead.email] : []),
      existingPhones: (existing ?? []).flatMap((lead) => lead.phone ? [lead.phone] : []),
      existingDomains: existingSourceIdentities(existing ?? []),
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

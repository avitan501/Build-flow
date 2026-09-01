import { NextResponse } from "next/server"
import { z } from "zod"

import { requireStaffProfile } from "@/lib/auth"

const inputSchema = z.object({
  department: z.string().trim().min(2).max(100),
  zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  excludeDomains: z.array(z.string().trim().max(160)).max(60).default([]),
})

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""
}

function companyName(title: string, domain: string) {
  const cleaned = title.split(/[|–—]/)[0]?.replace(/\b(home|official site|contact us|locations?)\b/gi, "").trim()
  if (cleaned && cleaned.length >= 2) return cleaned.slice(0, 160)
  return domain.split(".")[0]?.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 160) || domain
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaffProfile("suppliers")
    const parsed = inputSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a department and a valid ZIP code." }, { status: 400 })

    if (!process.env.EXA_API_KEY) {
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean
        buyNow?: Array<{ title?: string; url?: string; domain?: string; snippet?: string }>
        callForPrice?: Array<{ title?: string; url?: string; domain?: string; snippet?: string }>
        salesContacts?: Array<{ company?: string; url?: string; domain?: string; role?: string }>
        error?: string
      }>("aura-messaging-broker", {
        body: {
          action: "price_research",
          query: `${parsed.data.department} construction suppliers and distributors`,
          department: parsed.data.department,
          zipCode: parsed.data.zipCode,
          excludeDomains: parsed.data.excludeDomains,
        },
      })
      if (error || !data?.ok) return NextResponse.json({ ok: false, error: data?.error || "Supplier discovery is temporarily unavailable." }, { status: 503 })
      const combined = [
        ...(data.buyNow ?? []).map((item) => ({ name: item.title, url: item.url, domain: item.domain, summary: item.snippet })),
        ...(data.callForPrice ?? []).map((item) => ({ name: item.title, url: item.url, domain: item.domain, summary: item.snippet })),
        ...(data.salesContacts ?? []).map((item) => ({ name: item.company, url: item.url, domain: item.domain, summary: item.role })),
      ]
      const seen = new Set<string>()
      const suppliers = combined.flatMap((item) => {
        try {
          const url = new URL(clean(item.url, 1200))
          const domain = clean(item.domain, 160) || url.hostname.replace(/^www\./, "")
          if (url.protocol !== "https:" || seen.has(domain) || parsed.data.excludeDomains.includes(domain)) return []
          seen.add(domain)
          return [{ name: companyName(clean(item.name, 240), domain), url: url.toString(), domain, summary: clean(item.summary, 500) }]
        } catch {
          return []
        }
      }).slice(0, 10)
      return NextResponse.json({ ok: true, suppliers })
    }

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.EXA_API_KEY },
      body: JSON.stringify({
        query: `Construction material suppliers and distributors selling ${parsed.data.department} and serving ZIP code ${parsed.data.zipCode}. Find local branches, independent suppliers, distributors, and contractor sales desks. Return official company pages, not articles or directories.`,
        type: "deep-lite",
        numResults: 20,
        contents: { highlights: { query: "company products departments delivery area contractor sales contact", maxCharacters: 800 }, maxAgeHours: 0 },
        excludeDomains: parsed.data.excludeDomains,
      }),
    })
    if (!response.ok) return NextResponse.json({ ok: false, error: "Supplier discovery is temporarily unavailable." }, { status: 503 })
    const payload = await response.json() as { results?: Array<{ title?: string; url?: string; text?: string; highlights?: string[] }> }
    const seen = new Set<string>()
    const suppliers = (payload.results ?? []).flatMap((result) => {
      try {
        const url = new URL(clean(result.url, 1200))
        const domain = url.hostname.replace(/^www\./, "")
        if (url.protocol !== "https:" || seen.has(domain) || parsed.data.excludeDomains.includes(domain)) return []
        seen.add(domain)
        const title = clean(result.title, 240)
        return [{ name: companyName(title, domain), url: url.toString(), domain, summary: clean((result.highlights ?? []).join(" ") || result.text, 500) }]
      } catch {
        return []
      }
    }).slice(0, 10)
    return NextResponse.json({ ok: true, suppliers })
  } catch (error) {
    console.error("Supplier discovery failed", error)
    return NextResponse.json({ ok: false, error: "Manager sign-in is required." }, { status: 401 })
  }
}

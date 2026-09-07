import { readFile } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  effectiveLeadDepartment,
  LEAD_DEPARTMENTS,
  selectLeadDiscoveryCandidates,
} from "../lib/lead-discovery"

test("lead directory has the five requested departments", () => {
  expect(LEAD_DEPARTMENTS.map((department) => department.label)).toEqual([
    "Contractors",
    "Building owners",
    "Designers",
    "Inbound",
    "Manually added",
  ])
  expect(LEAD_DEPARTMENTS.filter((department) => department.discoverable).map((department) => department.value)).toEqual([1, 2, 3])
})

test("known website and owner screenshot leads land in the correct department", () => {
  expect(effectiveLeadDepartment({ relationship_level: 1, notes: "Source: Homepage Send text" })).toBe(4)
  expect(effectiveLeadDepartment({ relationship_level: 1, notes: "Lead screenshot source: activity-1" })).toBe(5)
  expect(effectiveLeadDepartment({ relationship_level: 2, notes: "Source: Homepage Send text" })).toBe(2)
})

test("lead discovery keeps only sourced public business contacts and removes duplicates", () => {
  const results = selectLeadDiscoveryCandidates({
    sources: [
      { title: "Ace Contracting | Contact", url: "https://ace-contracting.example/contact", text: "Call (516) 555-0100 or email bids@ace-contracting.example" },
      { title: "Duplicate Ace", url: "https://www.ace-contracting.example/about", text: "(516) 555-0100" },
      { title: "No contact", url: "https://quiet-builder.example", text: "Construction services" },
      { title: "Directory result", url: "https://yelp.com/biz/example", text: "516-555-0133" },
      { title: "Known company", url: "https://known.example/contact", text: "516-555-0199" },
    ],
    existingDomains: ["known.example"],
  })

  expect(results).toEqual([{
    companyName: "Ace Contracting",
    email: "bids@ace-contracting.example",
    phone: "+15165550100",
    sourceUrl: "https://ace-contracting.example/contact",
    sourceDomain: "ace-contracting.example",
  }])
})

test("lead discovery never returns more than fifty records", () => {
  const sources = Array.from({ length: 70 }, (_, index) => ({
    title: `Contractor ${index}`,
    url: `https://contractor-${index}.example/contact`,
    text: `Call 516-555-${String(index).padStart(4, "0")}`,
  }))
  expect(selectLeadDiscoveryCandidates({ sources })).toHaveLength(50)
})

test("separate OpenStreetMap businesses are not collapsed into one source", () => {
  const results = selectLeadDiscoveryCandidates({
    sources: [
      { title: "Builder One", url: "https://www.openstreetmap.org/node/101", text: "516-555-0101" },
      { title: "Builder Two", url: "https://www.openstreetmap.org/way/202", text: "516-555-0202" },
    ],
  })
  expect(results).toHaveLength(2)
})

test("lead generation is staff-only, source-backed, and never sends messages", async () => {
  const route = await readFile(path.join(process.cwd(), "app/api/admin/leads/generate/route.ts"), "utf8")

  expect(route).toContain('requireStaffProfile("customers")')
  expect(route).toContain("nominatim.openstreetmap.org")
  expect(route).toContain('placePayload[0]?.type !== "postcode"')
  expect(route).toContain("overpass.kumi.systems")
  expect(route).toContain("overpass-api.de")
  expect(route).toContain("Source: ${lead.sourceUrl}")
  expect(route).toContain('relationship_level: parsed.data.department')
  expect(route).toContain('domain === "openstreetmap.org" ? `${domain}${url.pathname}` : domain')
  expect(route).not.toContain("send-message")
  expect(route).not.toContain("whatsapp")
  expect(route).not.toContain("sms")
})

test("manual lead entry defaults safely and rejects an existing email or phone", async () => {
  const actions = await readFile(path.join(process.cwd(), "app/admin/goals-progress/lead-actions.ts"), "utf8")

  expect(actions).toContain("input.relationshipLevel : 5")
  expect(actions).toContain("already exists in the Lead Directory")
  expect(actions).toContain('revalidatePath("/admin/users")')
})

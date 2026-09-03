import { expect, test } from "@playwright/test"

import {
  sortSupplierDirectoryAlphabetically,
  splitVerifiedSupplierDirectory,
  supplierMatchesDirectorySearch,
} from "@/lib/supplier-directory-search"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

const supplier: SupplierRoutingOption = {
  id: "metro-drywall",
  name: "Metro Building Supply",
  contactLabel: "Sales representative",
  contactName: "Maria Chen",
  email: "maria@metrobuild.com",
  phone: "+1 (516) 555-0123",
  whatsapp: "+1 516 555 0199",
  portalUrl: "https://metrobuild.example.com",
  preferredDeliveryMethod: "email",
  deliveryNotes: "Deliver to the north loading dock before noon.",
  deliveryCharge: 85,
  deliveryChargeNote: "Free delivery on orders over $1,500.",
  programChannels: ["API", "Trade"],
  notes: "Ask Maria about contractor pricing.",
  trustLevel: "verified",
  catalogDepartments: ["Sheet Rock", "Framing"],
  address: "100 Main Street, Mineola, NY",
  materials: "Drywall boards, screws, tape, and corner bead",
}

test("supplier search matches every useful directory field", () => {
  for (const query of [
    "metro",
    "Maria Chen",
    "sales representative",
    "maria@metrobuild.com",
    "5165550123",
    "sheet rock",
    "corner bead",
    "north loading",
    "85",
    "free delivery",
    "API",
    "contractor pricing",
    "Mineola",
    "verified",
  ]) {
    expect(supplierMatchesDirectorySearch(supplier, query), query).toBe(true)
  }
})

test("supplier search supports terms from different fields", () => {
  expect(supplierMatchesDirectorySearch(supplier, "Maria drywall Mineola")).toBe(true)
  expect(supplierMatchesDirectorySearch(supplier, "Maria roofing")).toBe(false)
  expect(supplierMatchesDirectorySearch(supplier, "")).toBe(true)
})

test("verified suppliers split preferred first and keep A-Z inside each section", () => {
  const suppliers: SupplierRoutingOption[] = [
    { ...supplier, id: "zeta-preferred", name: "Zeta Supply", trustLevel: "preferred" },
    { ...supplier, id: "alpha-approved", name: "Alpha Approved", trustLevel: "verified" },
    { ...supplier, id: "alpha-preferred", name: "Alpha Preferred", trustLevel: "preferred" },
    { ...supplier, id: "beta-trusted", name: "Beta Trusted", trustLevel: "trusted" },
    { ...supplier, id: "trial", name: "A Trial", trustLevel: "first-time" },
  ]

  const sections = splitVerifiedSupplierDirectory(suppliers)

  expect(sections.preferred.map((entry) => entry.name)).toEqual(["Alpha Preferred", "Zeta Supply"])
  expect(sections.approved.map((entry) => entry.name)).toEqual(["Alpha Approved", "Beta Trusted"])
  expect([...sections.preferred, ...sections.approved].map((entry) => entry.id)).not.toContain("trial")
  expect(suppliers.map((entry) => entry.name)).toEqual(["Zeta Supply", "Alpha Approved", "Alpha Preferred", "Beta Trusted", "A Trial"])
})

test("directory A-Z order is stable for numeric names and does not mutate saved data", () => {
  const suppliers: SupplierRoutingOption[] = [
    { ...supplier, id: "yard-10", name: "Yard 10" },
    { ...supplier, id: "yard-2", name: "yard 2" },
    { ...supplier, id: "alpha", name: "Alpha" },
  ]

  expect(sortSupplierDirectoryAlphabetically(suppliers).map((entry) => entry.id)).toEqual(["alpha", "yard-2", "yard-10"])
  expect(suppliers.map((entry) => entry.id)).toEqual(["yard-10", "yard-2", "alpha"])
})

import { expect, test } from "@playwright/test"

import { supplierMatchesDirectorySearch } from "@/lib/supplier-directory-search"
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

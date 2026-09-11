import { expect, test } from "@playwright/test"
import { hasSupplierRouteOverride, requestSupplierRouteGroupKey, supplierGroupRouteDefault, supplierRouteMetadataPatch, supplierRouteRevision, type SupplierGroupRoute } from "../lib/request-supplier-group-route"

const route: SupplierGroupRoute = { names: ["Group supplier"], entries: [{ supplier_id: "group", name: "Group supplier" }], notes: { "Group supplier": "Call first" } }

test("group identity agrees with the workspace department and fallback name rules", () => {
  expect(requestSupplierRouteGroupKey({ name: "Anything", department: "Dry_Wall" })).toBe("dry wall")
  expect(requestSupplierRouteGroupKey({ name: "Control valve", department: "" })).toBe("plumbing")
  expect(requestSupplierRouteGroupKey({ name: "Breaker", department: null })).toBe("electrical")
  expect(requestSupplierRouteGroupKey({ name: "Unknown", department: null })).toBe("other materials")
})
test("group defaults update inherited items and preserve unrelated item metadata", () => {
  const saved = supplierRouteMetadataPatch({ dimensions: "4 in" }, route, "group", "plumbing")
  expect(saved).toMatchObject({ supplier_route_names: route.names, supplier_route_mode: "group", supplier_route_revision: 1, dimensions: "4 in" })
  expect(supplierGroupRouteDefault(saved, "plumbing")).toEqual(route)
  expect(supplierGroupRouteDefault(saved, "electrical")).toBeNull()
})
test("legacy nonempty suppliers and explicit empty overrides survive group updates", () => {
  const legacy = { supplier_route_names: ["Existing supplier"], supplier_route_notes: { "Existing supplier": "Keep this note" } }
  expect(hasSupplierRouteOverride(legacy)).toBe(true)
  const saved = supplierRouteMetadataPatch(legacy, route, "group", "plumbing")
  expect(saved).toMatchObject({ supplier_route_names: ["Existing supplier"], supplier_route_notes: legacy.supplier_route_notes, supplier_route_mode: "override", supplier_route_group_default: route })
  expect(supplierRouteMetadataPatch({ supplier_route_mode: "override", supplier_route_names: [] }, route, "group", "plumbing").supplier_route_names).toEqual([])
})
test("individual and explicit batch edits become overrides, never group defaults", () => {
  for (const mode of ["item", "batch"] as const) {
    const saved = supplierRouteMetadataPatch({ supplier_route_mode: "group", supplier_route_group_default: route }, { ...route, names: ["Override"] }, mode, "plumbing")
    expect(saved).toMatchObject({ supplier_route_mode: "override", supplier_route_names: ["Override"], supplier_route_group_default: route })
  }
})
test("reset returns an item to the saved group default and later group updates flow through", () => {
  const reset = supplierRouteMetadataPatch({ supplier_route_mode: "override", supplier_route_names: ["Other"], supplier_route_revision: 7 }, route, "reset", "plumbing")
  expect(reset).toMatchObject({ supplier_route_mode: "group", supplier_route_names: route.names, supplier_route_revision: 8 })
  expect(hasSupplierRouteOverride(reset)).toBe(false)
  expect(supplierRouteMetadataPatch(reset, { ...route, names: ["New group"] }, "group", "plumbing").supplier_route_names).toEqual(["New group"])
})
test("malformed defaults do not become usable routes and revision fallback is nonnegative", () => {
  expect(supplierGroupRouteDefault({ supplier_route_group_default: { names: [1] } })).toBeNull()
  expect(supplierRouteRevision({ supplier_route_revision: -1 })).toBe(0)
  expect(supplierRouteRevision(null)).toBe(0)
})

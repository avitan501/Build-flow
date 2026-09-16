import { test, expect } from "@playwright/test"
import { materialCleanLine } from "../lib/material-clean-line"

test("material copy excludes delivery data while preserving product specifications and floor", () => {
  const fields = [
    { id: "delivery-address", label: "Delivery address", value: "28 Woodmere S, Woodmere, NY" },
    { id: "shipping", label: "Shipping / delivery", value: "First delivery" },
    { id: "depth", label: "Depth", value: "10 in" },
    { id: "length", label: "Length", value: "26 ft" },
    { id: "section", label: "Section", value: "Second floor" },
    { id: "clarify-tji", label: "TJI question", value: "internal answer" },
  ]
  const original = JSON.stringify(fields)
  const line = materialCleanLine({ name: "TJI 230 I-joist", quantity: 12, unit: "pieces", fields, details: "28 Woodmere S, Woodmere, NY · Top mount required" })
  expect(line).toBe("12 pieces · TJI 230 I-joist · 10 in · 26 ft · Second floor · Top mount required")
  expect(JSON.stringify(fields)).toBe(original)
})

test("cleaning retains material grade, coatings, packaging and unknown detail text", () => {
  expect(materialCleanLine({ name: "Nails", quantity: 2, unit: "boxes", fields: [{ id: "grade", label: "Grade", value: "Hot-dip galvanized" }], details: "50 lb per box · Exact model required" })).toContain("Hot-dip galvanized · 50 lb per box · Exact model required")
})

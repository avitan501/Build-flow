import { expect, test } from "@playwright/test"

import { mergeSemanticallyEquivalentMaterialItems, type SemanticMaterialItem } from "../supabase/functions/client-material-list-ai/semantic-merge"

function row(input: Partial<SemanticMaterialItem> & Pick<SemanticMaterialItem, "name" | "quantity" | "sourceText">): SemanticMaterialItem {
  return {
    department: "Drywall",
    unit: "sheets",
    dimensions: "4 x 8 ft",
    thickness: "5/8 in",
    details: "Regular",
    needsReview: false,
    reviewStatus: "ready",
    reviewReasons: [],
    ...input,
  }
}

test("safely merges English and Spanish Sheetrock aliases and preserves total quantity", () => {
  const merged = mergeSemanticallyEquivalentMaterialItems([
    row({ name: "Sheettrock", quantity: 12, sourceText: "12 sheets sheettrock 5/8 4x8 regular" }),
    row({ name: "Panel de yeso", quantity: 8, sourceText: "8 placas panel de yeso 5/8 4x8 regular" }),
  ])

  expect(merged).toHaveLength(1)
  expect(merged[0]).toMatchObject({ quantity: 20, dimensions: "4 x 8 ft", thickness: "5/8 in" })
})

test("does not merge different sizes or incompatible Sheetrock types", () => {
  const merged = mergeSemanticallyEquivalentMaterialItems([
    row({ name: "Sheetrock", quantity: 10, sourceText: "10 regular", details: "Regular" }),
    row({ name: "Drywall", quantity: 7, sourceText: "7 type X", details: "Type X" }),
    row({ name: "Drywall", quantity: 4, sourceText: "4 regular 1/2", thickness: "1/2 in", details: "Regular" }),
  ])
  expect(merged).toHaveLength(3)
  expect(merged.map((item) => item.quantity)).toEqual([10, 7, 4])
})

test("does not merge an unspecified line into a sized or rated line", () => {
  const merged = mergeSemanticallyEquivalentMaterialItems([
    row({ name: "Drywall", quantity: 5, sourceText: "5 sheets drywall" }),
    row({ name: "Drywall", quantity: 8, sourceText: "8 sheets 5/8 Type X drywall", thickness: "5/8 in", details: "Type X" }),
  ])
  expect(merged).toHaveLength(2)
})

test("deduplicates repeated attachment evidence without doubling and never invents missing dimensions", () => {
  const needsSize = row({
    name: "Drywall",
    quantity: 6,
    sourceText: "6 sheets drywall",
    dimensions: "",
    thickness: "",
    details: "",
    needsReview: true,
    reviewStatus: "missing",
    reviewReasons: ["Thickness is missing"],
  })
  const merged = mergeSemanticallyEquivalentMaterialItems([needsSize, { ...needsSize }])
  expect(merged).toHaveLength(1)
  expect(merged[0]).toMatchObject({ quantity: 6, dimensions: "", thickness: "", reviewStatus: "missing" })
})

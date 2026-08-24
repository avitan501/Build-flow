import { expect, test } from "@playwright/test"

import { detectExplicitQuantityUnit, materialRequiresThickness, recognizedFastenerDimensions, removeResolvedFastenerReasons, removeResolvedQuantityUnitReasons, verifiedThickness } from "../supabase/functions/client-material-list-ai/material-list-normalization"

const sidingFormats = [
  "14 squares of siding",
  "Siding: 14 squares",
  "14 sq siding",
  "- 14 squares siding",
  "| 14 | squares | siding |",
  "| siding | 14 | squares |",
]

for (const source of sidingFormats) {
  test(`detects an existing siding quantity and unit: ${source}`, () => {
    expect(detectExplicitQuantityUnit(source)).toMatchObject({ quantity: 14, unit: "squares" })
  })
}

test("recognizes common singular and plural construction units", () => {
  expect(detectExplicitQuantityUnit("1 box roofing nails")).toMatchObject({ quantity: 1, unit: "box" })
  expect(detectExplicitQuantityUnit("2 boxes roofing nails")).toMatchObject({ quantity: 2, unit: "boxes" })
  expect(detectExplicitQuantityUnit("3 rolls insulation")).toMatchObject({ quantity: 3, unit: "rolls" })
  expect(detectExplicitQuantityUnit("Joint compound: 4 pails")).toMatchObject({ quantity: 4, unit: "pails" })
})

test("removes only redundant quantity and unit review reasons", () => {
  const detected = detectExplicitQuantityUnit("14 squares siding")
  expect(removeResolvedQuantityUnitReasons([
    "Quantity is missing",
    "Sales unit is missing",
    "Siding color is missing",
  ], detected)).toEqual(["Siding color is missing"])
})

test("does not infer invalid or absent quantities", () => {
  expect(detectExplicitQuantityUnit("-5 squares siding")).toBeNull()
  expect(detectExplicitQuantityUnit("siding without quantity")).toBeNull()
})

test("accepts thickness only when the same explicit measurement exists in the source", () => {
  expect(verifiedThickness('1/2 in.', '220 sheets of 1/2" drywall')).toBe('1/2 in.')
  expect(verifiedThickness("12 mm", "Tile backer, 12 mm, 20 sheets")).toBe("12 mm")
  expect(verifiedThickness("16 gauge", "16 ga steel studs, 40 pieces")).toBe("16 gauge")
})

test("rejects quantities and unsupported values presented as thickness", () => {
  expect(verifiedThickness("12", "12 sheets of drywall")).toBe("")
  expect(verifiedThickness("1/2 in.", "12 sheets of drywall")).toBe("")
  expect(materialRequiresThickness("Sheetrock drywall")).toBe(true)
  expect(materialRequiresThickness("Sheetrock screws")).toBe(false)
})

test("recognizes common coil nail length and shank notation without unnecessary clarification", () => {
  expect(recognizedFastenerDimensions('3" x 120 coil framing nail', '2 boxes 3"x120 coil framing nail')).toBe("3 in. length x 0.120 in. shank")
  expect(recognizedFastenerDimensions('2" x 099 coil smooth shank nail', '5 box 2\" x .099 coil smooth shank nail')).toBe("2 in. length x 0.099 in. shank")
  expect(removeResolvedFastenerReasons(["Clarify whether 3x120 means nail length and shank diameter"], "3 in. length x 0.120 in. shank")).toEqual([])
  expect(recognizedFastenerDimensions("120 pieces lumber", "120 pieces lumber")).toBe("")
})

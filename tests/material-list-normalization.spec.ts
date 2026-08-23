import { expect, test } from "@playwright/test"

import { detectExplicitQuantityUnit, removeResolvedQuantityUnitReasons } from "../supabase/functions/client-material-list-ai/material-list-normalization"

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

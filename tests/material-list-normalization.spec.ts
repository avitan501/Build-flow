import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

import { detectExplicitQuantityUnit, dimensionalLumberNeedsType, fastenerNeedsLength, findExplicitQuantityUnitEvidence, findStructuredMaterialSource, materialRequiresThickness, recognizedFastenerDimensions, removeResolvedFastenerReasons, removeResolvedQuantityUnitReasons, resolveMaterialQuantityUnit, verifiedThickness } from "../supabase/functions/client-material-list-ai/material-list-normalization"

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

test("preserves an explicit underlayment quantity instead of accepting an AI default", () => {
  expect(resolveMaterialQuantityUnit({
    sourceText: "6 rolls underlayment",
    extractedQuantity: 1,
    extractedUnit: "each",
  })).toMatchObject({ quantity: 6, unit: "rolls" })
})

test("recovers a quantity from the matching original free-text line when AI source text drops it", () => {
  const evidence = findExplicitQuantityUnitEvidence(
    { name: "Flooring underlayment", sourceText: "underlayment" },
    "6 rolls underlayment\n2 boxes flooring nails",
  )
  expect(evidence).toMatchObject({ line: "6 rolls underlayment", detected: { quantity: 6, unit: "rolls" } })
  expect(resolveMaterialQuantityUnit({
    sourceText: evidence?.line || "underlayment",
    extractedQuantity: 1,
    extractedUnit: "each",
  })).toMatchObject({ quantity: 6, unit: "rolls" })
})

test("does not borrow a quantity when two original free-text lines are equally plausible", () => {
  expect(findExplicitQuantityUnitEvidence(
    { name: "Fastener", sourceText: "fastener" },
    "2 boxes framing fastener\n4 boxes roofing fastener",
  )).toBeNull()
})

test("grounds each AI item to its own line when AI source text repeats the whole request", () => {
  const source = "24 sheets 5/8-in regular drywall\n10 pieces SPF studs\n5 boxes drywall screws"
  const repeatedSource = source
  expect(findExplicitQuantityUnitEvidence(
    { name: "Regular drywall", sourceText: repeatedSource }, source,
  )?.detected).toMatchObject({ quantity: 24, unit: "sheets" })
  expect(findExplicitQuantityUnitEvidence(
    { name: "SPF studs", sourceText: repeatedSource }, source,
  )?.detected).toMatchObject({ quantity: 10, unit: "pieces" })
  expect(findExplicitQuantityUnitEvidence(
    { name: "Drywall screws", sourceText: repeatedSource }, source,
  )?.detected).toMatchObject({ quantity: 5, unit: "boxes" })
})

test("maps a structured edited item back to its own quantity without crossing other rows", () => {
  const sources = [
    { id: "underlayment", name: "Underlayment", quantity: 6, unit: "rolls" },
    { id: "qa-item", name: "QA acoustic sealant", quantity: 3, unit: "tubes" },
  ]
  const matched = findStructuredMaterialSource(
    { name: "Acoustic sealant", sourceText: "QA acoustic sealant" },
    sources,
  )
  expect(matched?.id).toBe("qa-item")
  expect(resolveMaterialQuantityUnit({
    sourceText: "QA acoustic sealant",
    extractedQuantity: 1,
    extractedUnit: "each",
    structuredSource: matched,
  })).toMatchObject({ quantity: 3, unit: "tubes" })
})

test("a sole structured QA item keeps its saved quantity after AI normalization and retry", () => {
  const matched = findStructuredMaterialSource(
    { name: "Fastener", sourceText: "fastener" },
    [{ id: "qa-item", name: "QA test fastener", quantity: 7, unit: "boxes" }],
  )
  expect(matched?.id).toBe("qa-item")
  expect(resolveMaterialQuantityUnit({
    sourceText: "fastener",
    extractedQuantity: 1,
    extractedUnit: "each",
    structuredSource: matched,
  })).toMatchObject({ quantity: 7, unit: "boxes" })
})

test("the organizer preserves line breaks and grounds saved rows before replacing retry results", async () => {
  const source = await readFile(path.join(process.cwd(), "supabase/functions/client-material-list-ai/index.ts"), "utf8")
  expect(source).toContain("cleanMultiline(originalSource.metadata?.request_details")
  expect(source).toContain("findExplicitQuantityUnitEvidence")
  expect(source).toContain("sourceText: groundedSourceText")
  expect(source).toContain("source_text: groundedSourceText")
  expect(source.indexOf("const explicitEvidence")).toBeLessThan(source.indexOf('insert(rows).select("id")'))
})

test("editing one original row synchronizes its sole organized quantity", async () => {
  const actions = await readFile(path.join(process.cwd(), "app/owner/materials/requests/actions.ts"), "utf8")
  expect(actions).toContain('.contains("metadata", { ai_organized: true, source_item_id: itemId })')
  expect(actions).toContain("organizedRows?.length === 1")
  expect(actions).toContain("quantity_defaulted: false")
})

test("keeps a leading lumber count separate from 2x4x8 dimensions", () => {
  expect(detectExplicitQuantityUnit("50 pieces — wood lumber 2x4x8")).toMatchObject({ quantity: 50, unit: "pieces" })
})

test("does not mark generic dimensional lumber ready without its lumber type", () => {
  expect(dimensionalLumberNeedsType("Wood lumber", "100 pieces 2x4x8")).toBe(true)
  expect(dimensionalLumberNeedsType("2x4x8 studs", "100 each")).toBe(true)
  expect(dimensionalLumberNeedsType("2x4x8 studs", "100 regular SPF studs")).toBe(false)
  expect(dimensionalLumberNeedsType("2x4x8 pressure-treated lumber", "100 pieces")).toBe(false)
  expect(dimensionalLumberNeedsType("Douglas Fir 2x4x8", "100 pieces")).toBe(false)
  expect(dimensionalLumberNeedsType("Metal studs", "100 pieces 3-5/8 x 10 ft")).toBe(false)
  expect(dimensionalLumberNeedsType("1/2 in. plywood", "20 sheets 4x8")).toBe(false)
  expect(dimensionalLumberNeedsType("12x24 porcelain tile", "50 boxes")).toBe(false)
  expect(dimensionalLumberNeedsType("1/2 in. cement board", "20 sheets 3x5")).toBe(false)
})

test("does not mark fasteners ready without a length", () => {
  expect(fastenerNeedsLength("Drywall screws", "1 box")).toBe(true)
  expect(fastenerNeedsLength("Drywall screws", "1 box 1-1/4 in.")).toBe(false)
  expect(fastenerNeedsLength("Coil framing nails", '4 boxes 3" x .120')).toBe(false)
  expect(fastenerNeedsLength("Wood lumber", "100 pieces 2x4x8")).toBe(false)
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
  expect(verifiedThickness("5/8 in.", "24 sheets 5/8-in regular drywall")).toBe("5/8 in.")
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

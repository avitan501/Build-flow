import { expect, test } from "@playwright/test"

import { materialReviewChoiceUpdate, materialReviewRecommendation, savedMaterialReviewValue } from "../lib/material-review-recommendations"
import { materialQuantity, materialReviewReasons, materialSalesUnit } from "../lib/client-material-review"

const base = {
  id: "item-1",
  name: "Regular Sheetrock drywall",
  department: "Sheet rock",
  quantity: 12,
  unit: "sheets",
  metadata: { review_status: "missing", review_reasons: ["Thickness is missing", "Size is missing"] },
}

test("recommends common residential drywall specifications without silently approving them", () => {
  expect(materialReviewRecommendation(base)).toMatchObject({
    resolvesAllReasons: true,
  })
  expect(materialReviewRecommendation(base).choices).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "thickness", options: expect.arrayContaining([expect.objectContaining({ value: "1/2 in.", confidence: 72 })]) }),
    expect.objectContaining({ field: "dimensions", options: expect.arrayContaining([expect.objectContaining({ value: "4 x 8 ft.", confidence: 70 })]) }),
  ]))
  expect(materialReviewRecommendation({ ...base, name: "Type X drywall" }).choices.find((choice) => choice.field === "thickness")?.recommended).toBe("5/8 in.")
})

test("does not reconfirm an extracted quantity when another detail is missing", () => {
  const recommendation = materialReviewRecommendation({ ...base, name: "Vinyl siding", department: "Siding", metadata: { review_status: "missing", review_reasons: ["Color is missing"] } })
  expect(recommendation.choices).toHaveLength(0)
  expect(recommendation.resolvesAllReasons).toBe(false)
})

test("defaults an absent quantity and sales unit without asking for confirmation", () => {
  const item = {
    ...base,
    name: "Sheetrock screws",
    quantity: 0,
    unit: "unspecified",
    metadata: { review_status: "missing", review_reasons: ["Quantity is missing", "Sales unit is missing"] },
  }
  const recommendation = materialReviewRecommendation(item)
  expect(materialQuantity(item)).toBe(1)
  expect(materialSalesUnit(item)).toBe("boxes")
  expect(materialReviewReasons(item)).toHaveLength(0)
  expect(recommendation.choices).toHaveLength(0)
  expect(recommendation.choices.map((choice) => choice.field)).not.toContain("quantity")
  expect(recommendation.choices.map((choice) => choice.field)).not.toContain("unit")
  expect(recommendation.resolvesAllReasons).toBe(true)
})

test("known exact 5/8 thickness asks only for missing plywood sheet size", () => {
  const item = { ...base, name: "CDX plywood", metadata: { thickness: "5/8", ai_organized: true, review_status: "missing", review_reasons: ["Plywood sheet dimensions are missing"] } }
  expect(materialReviewRecommendation(item).choices.map((entry) => entry.field)).toEqual(["dimensions"])
  const updated = materialReviewChoiceUpdate(item, "dimensions", "4 x 8 ft.")!
  expect(updated.metadata.thickness).toBe("5/8")
  expect(updated.metadata.review_status).toBe("ready")
  expect(updated.quantity).toBe(item.quantity)
  expect(materialReviewChoiceUpdate(item, "thickness", "1/2 in.")).toBeNull()
  expect(materialReviewChoiceUpdate(item, "dimensions", "")).toBeNull()
})

test("structured saved fields retain non-preset thickness and custom dimensions", () => {
  const item = { ...base, name: "CDX plywood", metadata: { request_item_fields: [{ id: "thickness", label: "Thickness", value: '5/8"' }, { id: "dimensions", label: "Sheet size", value: "Custom 4 x 9" }], review_reasons: ["Sheet size is missing", "Thickness is missing"] } }
  expect(savedMaterialReviewValue(item, "thickness")).toBe('5/8"')
  expect(materialReviewRecommendation(item).choices).toHaveLength(0)
  expect(materialReviewChoiceUpdate(item, "dimensions", "4 x 8 ft.")).toBeNull()
})

test("saving one missing field leaves other missing details unresolved", () => {
  const updated = materialReviewChoiceUpdate(base, "dimensions", "4 x 8 ft.")!
  expect(updated.metadata.review_reasons).toEqual(["Thickness is missing"])
  expect(updated.metadata.review_status).toBe("missing")
  expect(materialReviewRecommendation(updated).choices.map((entry) => entry.field)).toEqual(["thickness"])
  expect(materialReviewChoiceUpdate(updated, "thickness", "5/8 in.")!.metadata.review_status).toBe("ready")
})

test("unrelated uncertainty and grade cannot be cleared by choosing a sheet size", () => {
  const item = { ...base, metadata: { ...base.metadata, review_reasons: ["Size is missing", "Confirm grade", "Check product match"] } }
  expect(materialReviewChoiceUpdate(item, "dimensions", "4 x 8 ft.")!.metadata.review_reasons).toEqual(["Confirm grade", "Check product match"])
  expect(materialReviewRecommendation({ ...base, metadata: { review_reasons: ["Grade and thickness are missing"] } }).choices).toHaveLength(0)
})

test("unknown choices and unspecified confirmations never become persisted defaults", () => {
  expect(materialReviewChoiceUpdate(base, "dimensions", "99 x 99")).toBeNull()
  expect(materialReviewChoiceUpdate(base, "__proto__", "x")).toBeNull()
  const lumber = { ...base, name: "Framing lumber", metadata: { review_reasons: ["Lumber type is missing"] } }
  expect(materialReviewChoiceUpdate(lumber, "productType", "Other / confirm")).toBeNull()
})

test("offers material-specific controls for WonderBoard and drywall screws", () => {
  const wonderBoard = materialReviewRecommendation({ ...base, name: "WonderBoard cement backerboard" })
  expect(wonderBoard.choices).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "thickness", recommended: "1/2 in." }),
    expect.objectContaining({ field: "dimensions", recommended: "3 x 5 ft." }),
  ]))

  const screws = materialReviewRecommendation({ ...base, name: "Sheetrock screws", unit: "boxes", quantity: 2, metadata: { review_status: "missing", review_reasons: ["Screw length is missing"] } })
  expect(screws.choices).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "screwLength", recommended: "1 1/4 in.", options: expect.arrayContaining([expect.objectContaining({ value: "1 5/8 in.", confidence: 30 })]) }),
  ]))
  expect(screws.resolvesAllReasons).toBe(true)
})

test("offers both sheet size and thickness so plywood review can be completed", () => {
  const plywood = materialReviewRecommendation({
    ...base,
    name: "CDX plywood",
    quantity: 45,
    unit: "pc",
    metadata: { review_status: "missing", review_reasons: ["Plywood sheet dimensions are missing", "Thickness is missing"] },
  })

  expect(plywood.choices).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "thickness" }),
    expect.objectContaining({ field: "dimensions", recommended: "4 x 8 ft." }),
  ]))
  expect(plywood.resolvesAllReasons).toBe(true)
})

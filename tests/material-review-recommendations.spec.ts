import { expect, test } from "@playwright/test"

import { materialReviewRecommendation } from "../lib/material-review-recommendations"

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
    expect.objectContaining({ field: "quantity", options: expect.arrayContaining([expect.objectContaining({ value: "12", confidence: 100 })]) }),
    expect.objectContaining({ field: "productType", options: expect.arrayContaining([expect.objectContaining({ value: "Regular drywall", confidence: 65 })]) }),
    expect.objectContaining({ field: "thickness", options: expect.arrayContaining([expect.objectContaining({ value: "1/2 in.", confidence: 72 })]) }),
    expect.objectContaining({ field: "dimensions", options: expect.arrayContaining([expect.objectContaining({ value: "4 x 8 ft.", confidence: 70 })]) }),
  ]))
  expect(materialReviewRecommendation({ ...base, name: "Type X drywall" }).choices.find((choice) => choice.field === "thickness")?.recommended).toBe("5/8 in.")
})

test("keeps the extracted quantity available when no dependable product recommendation exists", () => {
  const recommendation = materialReviewRecommendation({ ...base, name: "Vinyl siding", department: "Siding", metadata: { review_status: "missing", review_reasons: ["Color is missing"] } })
  expect(recommendation.choices).toHaveLength(1)
  expect(recommendation.choices[0]).toMatchObject({ field: "quantity", recommended: "12" })
  expect(recommendation.resolvesAllReasons).toBe(false)
})

test("defaults an absent quantity to one and offers only sensible sales units", () => {
  const recommendation = materialReviewRecommendation({
    ...base,
    name: "Sheetrock screws",
    quantity: 0,
    unit: "unspecified",
    metadata: { review_status: "missing", review_reasons: ["Quantity is missing", "Sales unit is missing"] },
  })
  expect(recommendation.choices.find((choice) => choice.field === "quantity")).toMatchObject({
    recommended: "1",
    options: [{ value: "1", confidence: 100 }, { value: "2", confidence: 0 }, { value: "5", confidence: 0 }, { value: "10", confidence: 0 }],
  })
  expect(recommendation.choices.find((choice) => choice.field === "unit")).toMatchObject({
    recommended: "boxes",
    options: [{ value: "boxes", confidence: 80 }, { value: "packs", confidence: 15 }, { value: "pieces", confidence: 5 }],
  })
  expect(recommendation.resolvesAllReasons).toBe(true)
})

test("offers material-specific controls for WonderBoard and drywall screws", () => {
  const wonderBoard = materialReviewRecommendation({ ...base, name: "WonderBoard cement backerboard" })
  expect(wonderBoard.choices).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "quantity" }),
    expect.objectContaining({ field: "thickness", recommended: "1/2 in." }),
    expect.objectContaining({ field: "dimensions", recommended: "3 x 5 ft." }),
  ]))

  const screws = materialReviewRecommendation({ ...base, name: "Sheetrock screws", unit: "boxes", quantity: 2, metadata: { review_status: "missing", review_reasons: ["Screw length is missing"] } })
  expect(screws.choices).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "quantity", recommended: "2" }),
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

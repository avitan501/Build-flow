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
    patch: { thickness: "1/2 in.", dimensions: "4 x 8 ft." },
  })
  expect(materialReviewRecommendation({ ...base, name: "Type X drywall" }).patch.thickness).toBe("5/8 in.")
})

test("asks the client when no dependable standard value exists", () => {
  const recommendation = materialReviewRecommendation({ ...base, name: "Vinyl siding", department: "Siding", metadata: { review_status: "missing", review_reasons: ["Color is missing"] } })
  expect(recommendation.patch).toEqual({})
  expect(recommendation.label).toContain("Ask the client")
})

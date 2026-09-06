import { expect, test } from "@playwright/test"

import {
  fastenerNeedsLength,
  removeResolvedMeasurementReasons,
} from "../supabase/functions/client-material-list-ai/material-list-normalization"

test("a printed 2-inch siding-nail length clears the stale missing warning", () => {
  const evidence = '2" length · Ring shank; 5 lb box'
  const missing = fastenerNeedsLength("Stainless steel siding nails", evidence)

  expect(missing).toBe(false)
  expect(removeResolvedMeasurementReasons({
    reasons: ["Fastener length is missing"],
    name: "Stainless steel siding nails",
    evidence,
    fastenerLengthMissing: missing,
  })).toEqual([])
})

test("a printed 10-foot corner-post height clears only the generic size warning", () => {
  expect(removeResolvedMeasurementReasons({
    reasons: ["Size is missing", "Color is missing"],
    name: "Vinyl outside corner post",
    evidence: "10' height",
    fastenerLengthMissing: false,
  })).toEqual(["Color is missing"])
})

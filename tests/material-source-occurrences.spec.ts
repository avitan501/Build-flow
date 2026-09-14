import { test, expect } from "@playwright/test"
import { mergeSemanticallyEquivalentMaterialItems } from "../supabase/functions/client-material-list-ai/semantic-merge"

const item = { name: "Drywall", department: "Drywall", quantity: 10, unit: "sheets", dimensions: "4 x 8 ft", thickness: "5/8 in", details: "", needsReview: false, reviewStatus: "ready" as const, reviewReasons: [], sourceText: "10 sheets drywall 5/8 4x8" }

test("equal text on distinct source chunks remains two requested quantities", () => {
  const rows = [{ ...item, sourceChunk: "pages 1-3" }, { ...item, sourceChunk: "pages 4-6" }]
  expect(mergeSemanticallyEquivalentMaterialItems(rows, { preserveSourceRows: true })).toHaveLength(2)
})
test("equal text on distinct source row occurrences survives, replay of same occurrence deduplicates", () => {
  const first = { ...item, sourceChunk: "pages 1-3", sourceOccurrence: "0:0" }
  const second = { ...item, sourceChunk: "pages 1-3", sourceOccurrence: "0:1" }
  expect(mergeSemanticallyEquivalentMaterialItems([first, second], { preserveSourceRows: true })).toHaveLength(2)
  expect(mergeSemanticallyEquivalentMaterialItems([first, first], { preserveSourceRows: true })).toHaveLength(1)
})

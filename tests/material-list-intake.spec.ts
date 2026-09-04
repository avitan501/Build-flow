import { expect, test } from "@playwright/test"
import { parseMaterialIntakeLine } from "@/lib/material-list-intake"

test("collects misspelled spoken English without losing quantity or dimensions", () => {
  const row = parseMaterialIntakeLine("tuwnty for shets five eights shetrok reguler")
  expect(row).toMatchObject({ quantity: "24", item: "sheet 5/8 in. Sheetrock regular", needsReview: true })
  expect(row?.notes).toContain("Review interpretation")
})

test("collects common field spelling while requiring confirmation", () => {
  expect(parseMaterialIntakeLine("6 role underlaymint")).toMatchObject({ quantity: "6", item: "roll underlayment", needsReview: true })
  expect(parseMaterialIntakeLine("12 bukkit flor adesiv")).toMatchObject({ quantity: "12", item: "bucket flooring adhesive", needsReview: true })
})

test("recognizes Spanish number and material terms without inventing missing details", () => {
  const row = parseMaterialIntakeLine("doce cubetas adhesivo piso")
  expect(row).toMatchObject({ quantity: "12", item: "bucket adhesive flooring", needsReview: true })
  expect(row?.item).not.toContain("brand")
})

test("keeps unknown material wording intact", () => {
  expect(parseMaterialIntakeLine("custom LF860 assembly qty 3")).toMatchObject({ quantity: "3", item: "custom LF860 assembly", needsReview: false })
})

import { expect, test } from "@playwright/test"
import { parseMaterialIntakeLine } from "@/lib/material-list-intake"

test("collects misspelled spoken English without losing quantity or dimensions", () => {
  const row = parseMaterialIntakeLine("tuwnty for shets five eights shetrok reguler")
  expect(row).toMatchObject({ quantity: "24", unit: "sheet", item: "5/8 in. Sheetrock regular", needsReview: true })
  expect(row?.notes).toContain("Review interpretation")
})

test("collects common field spelling while requiring confirmation", () => {
  expect(parseMaterialIntakeLine("6 role underlaymint")).toMatchObject({ quantity: "6", unit: "roll", item: "underlayment", needsReview: true })
  expect(parseMaterialIntakeLine("12 bukkit flor adesiv")).toMatchObject({ quantity: "12", unit: "bucket", item: "flooring adhesive", needsReview: true })
})

test("recognizes Spanish number and material terms without inventing missing details", () => {
  const row = parseMaterialIntakeLine("doce cubetas adhesivo piso")
  expect(row).toMatchObject({ quantity: "12", unit: "bucket", item: "adhesive flooring", needsReview: true })
  expect(row?.item).not.toContain("brand")
})

test("keeps unknown material wording intact", () => {
  expect(parseMaterialIntakeLine("custom LF860 assembly qty 3")).toMatchObject({ quantity: "3", unit: "", item: "custom LF860 assembly", needsReview: false })
})

test("accepts the material-first delimited format shown by the organizer", () => {
  expect(parseMaterialIntakeLine("Joint compound | 4 | lightweight")).toMatchObject({
    quantity: "4",
    unit: "",
    item: "Joint compound",
    notes: "lightweight",
  })
})

test("keeps Spanish units separate and asks for review instead of inventing details", () => {
  const row = parseMaterialIntakeLine("veinte hojas yeso resistente")
  expect(row).toMatchObject({ quantity: "20", unit: "sheet", item: "yeso resistente", needsReview: true })
  expect(row?.notes).toContain("Review interpretation")
  expect(row?.item).not.toMatch(/price|brand|delivery/i)
})

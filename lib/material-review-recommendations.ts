import { materialQuantity, materialReviewReasons, materialSalesUnit, type ReviewableMaterialItem } from "@/lib/client-material-review"

export type RecommendationField = "quantity" | "unit" | "dimensions" | "thickness" | "productType" | "screwLength"

export type RecommendationOption = {
  value: string
  confidence: number
}

export type MaterialReviewRecommendation = {
  label: string
  choices: Array<{
    field: RecommendationField
    label: string
    options: RecommendationOption[]
    recommended: string
  }>
  resolvesAllReasons: boolean
}

function option(value: string, confidence: number): RecommendationOption {
  return { value, confidence }
}

function quantityChoices(item: ReviewableMaterialItem) {
  const currentQuantity = materialQuantity(item)
  const quantity = String(currentQuantity)
  const nearby = [1, 2, 5, 10]
    .filter((value) => value !== currentQuantity)
    .slice(0, 3)
    .map((value) => option(String(value), 0))
  return {
    field: "quantity" as const,
    label: `Quantity (${materialSalesUnit(item)})`,
    options: [option(quantity, 100), ...nearby],
    recommended: quantity,
  }
}

function hasChoice(choices: MaterialReviewRecommendation["choices"], field: RecommendationField) {
  return choices.some((choice) => choice.field === field)
}

export function materialReviewRecommendation(item: ReviewableMaterialItem): MaterialReviewRecommendation {
  const name = item.name.toLowerCase()
  const reasons = materialReviewReasons(item)
  const isDrywallBoard = /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard)\b/.test(name) && !/\bscrews?\b/.test(name)
  const isCementBoard = /\b(?:cement\s+board|wonderboard)\b/.test(name)
  const isDrywallScrew = /\b(?:(?:drywall|sheetrock)\s+)?screws?\b/.test(name)
  const isSheetMaterial = isDrywallBoard || isCementBoard || /\b(?:plywood|osb)\b/.test(name)
  const choices: MaterialReviewRecommendation["choices"] = []
  if (reasons.some((reason) => /\bquantity\b/i.test(reason))) choices.push(quantityChoices(item))

  if (isDrywallBoard) {
    const typeOptions = /\b(?:greenboard|moisture)\b/.test(name)
      ? [option("Moisture-resistant (green)", 90), option("Regular drywall", 6), option("Type X fire-resistant", 3), option("Mold-resistant (purple)", 1)]
      : /\btype\s*x\b/.test(name)
        ? [option("Type X fire-resistant", 95), option("Regular drywall", 3), option("Moisture-resistant (green)", 1), option("Mold-resistant (purple)", 1)]
        : [option("Regular drywall", 65), option("Type X fire-resistant", 20), option("Moisture-resistant (green)", 10), option("Mold-resistant (purple)", 5)]
    const thicknessOptions = /\btype\s*x\b/.test(name)
      ? [option("5/8 in.", 90), option("1/2 in.", 8), option("3/8 in.", 1), option("1/4 in.", 1)]
      : [option("1/2 in.", 72), option("5/8 in.", 20), option("3/8 in.", 5), option("1/4 in.", 3)]
    choices.push(
      { field: "productType", label: "Board type", options: typeOptions, recommended: typeOptions[0].value },
      { field: "thickness", label: "Thickness", options: thicknessOptions, recommended: thicknessOptions[0].value },
      { field: "dimensions", label: "Sheet size", options: [option("4 x 8 ft.", 70), option("4 x 12 ft.", 18), option("4 x 10 ft.", 12)], recommended: "4 x 8 ft." },
    )
  } else if (isCementBoard) {
    choices.push(
      { field: "thickness", label: "Thickness", options: [option("1/2 in.", 75), option("1/4 in.", 25)], recommended: "1/2 in." },
      { field: "dimensions", label: "Sheet size", options: [option("3 x 5 ft.", 85), option("4 x 8 ft.", 15)], recommended: "3 x 5 ft." },
    )
  } else if (/\b(?:plywood|osb)\b/.test(name)) {
    const recommended = /\bosb\b/.test(name) ? "7/16 in." : "1/2 in."
    choices.push(
      {
        field: "thickness",
        label: "Thickness",
        options: [recommended, ...["7/16 in.", "1/2 in.", "5/8 in.", "3/4 in."].filter((value) => value !== recommended)]
          .map((value, index) => option(value, index === 0 ? 60 : index === 1 ? 20 : 10)),
        recommended,
      },
      {
        field: "dimensions",
        label: "Sheet size",
        options: [option("4 x 8 ft.", 95), option("4 x 10 ft.", 3), option("4 x 12 ft.", 2)],
        recommended: "4 x 8 ft.",
      },
    )
  }

  if (isDrywallScrew) {
    choices.push({
      field: "screwLength",
      label: "Screw length",
      options: [option("1 1/4 in.", 55), option("1 5/8 in.", 30), option("2 in.", 10), option("3 in.", 5)],
      recommended: "1 1/4 in.",
    })
  }

  const resolvesAllReasons = reasons.every((reason) =>
    (/quantity/i.test(reason) && materialQuantity(item) > 0)
    || (/thickness/i.test(reason) && hasChoice(choices, "thickness"))
    || (/\b(?:type|grade)\b/i.test(reason) && hasChoice(choices, "productType"))
    || (/\b(?:screw\s+)?length\b/i.test(reason) && (hasChoice(choices, "screwLength") || hasChoice(choices, "dimensions")))
    || (/\b(?:size|dimensions?|width)\b/i.test(reason) && hasChoice(choices, "dimensions"))
    || (/\bunit\b/i.test(reason) && Boolean(materialSalesUnit(item)))
  )

  return {
    label: isSheetMaterial || isDrywallScrew || choices.length > 1 ? "Confirm order details" : "Confirm item detail",
    choices,
    resolvesAllReasons,
  }
}

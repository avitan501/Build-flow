import { materialReviewReasons, type ReviewableMaterialItem } from "@/lib/client-material-review"

export type MaterialReviewRecommendation = {
  label: string
  note: string
  patch: { dimensions?: string; thickness?: string; unit?: string }
  choices: Array<{
    field: "dimensions" | "thickness"
    label: string
    options: string[]
    recommended: string
  }>
  resolvesAllReasons: boolean
}

export function materialReviewRecommendation(item: ReviewableMaterialItem): MaterialReviewRecommendation {
  const name = item.name.toLowerCase()
  const reasons = materialReviewReasons(item)
  const needsThickness = reasons.some((reason) => /thickness/i.test(reason))
  const needsSize = reasons.some((reason) => /\b(?:size|dimension|width|length)\b/i.test(reason))
  const patch: MaterialReviewRecommendation["patch"] = {}
  const choices: MaterialReviewRecommendation["choices"] = []
  const recommendations: string[] = []

  if (needsThickness && /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard)\b/.test(name)) {
    patch.thickness = /\btype\s*x\b/.test(name) ? "5/8 in." : "1/2 in."
    choices.push({ field: "thickness", label: "Thickness", options: [patch.thickness, ...["1/2 in.", "5/8 in.", "3/8 in.", "1/4 in."].filter((value) => value !== patch.thickness)], recommended: patch.thickness })
    recommendations.push(`${patch.thickness} thickness`)
  } else if (needsThickness && /\b(?:cement\s+board|wonderboard)\b/.test(name)) {
    patch.thickness = "1/2 in."
    choices.push({ field: "thickness", label: "Thickness", options: ["1/2 in.", "1/4 in."], recommended: patch.thickness })
    recommendations.push("1/2 in. thickness")
  } else if (needsThickness && /\b(?:plywood|osb)\b/.test(name)) {
    patch.thickness = /\bosb\b/.test(name) ? "7/16 in." : "1/2 in."
    choices.push({ field: "thickness", label: "Thickness", options: [patch.thickness, ...["7/16 in.", "1/2 in.", "5/8 in.", "3/4 in."].filter((value) => value !== patch.thickness)], recommended: patch.thickness })
    recommendations.push(`${patch.thickness} thickness`)
  }

  if (needsSize && /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard)\b/.test(name)) {
    patch.dimensions = "4 x 8 ft."
    choices.push({ field: "dimensions", label: "Sheet size", options: ["4 x 8 ft.", "4 x 10 ft.", "4 x 12 ft."], recommended: patch.dimensions })
    recommendations.push("4 x 8 ft. sheets")
  }

  const resolvesAllReasons = reasons.every((reason) =>
    (/thickness/i.test(reason) && choices.some((choice) => choice.field === "thickness"))
    || (/\b(?:size|dimension|width|length)\b/i.test(reason) && choices.some((choice) => choice.field === "dimensions"))
  )

  if (recommendations.length) {
    return {
      label: `Suggested: ${recommendations.join(" · ")}`,
      note: "Common residential choice. Confirm the plans or client requirements before marking it ready.",
      patch,
      choices,
      resolvesAllReasons,
    }
  }

  return {
    label: `Ask the client: ${reasons.join("; ")}`,
    note: "No reliable standard value can be selected without the client or plans.",
    patch,
    choices,
    resolvesAllReasons: false,
  }
}

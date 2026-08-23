import { materialReviewReasons, type ReviewableMaterialItem } from "@/lib/client-material-review"

export type MaterialReviewRecommendation = {
  label: string
  note: string
  patch: { dimensions?: string; thickness?: string; unit?: string }
}

export function materialReviewRecommendation(item: ReviewableMaterialItem): MaterialReviewRecommendation {
  const name = item.name.toLowerCase()
  const reasons = materialReviewReasons(item)
  const needsThickness = reasons.some((reason) => /thickness/i.test(reason))
  const needsSize = reasons.some((reason) => /\b(?:size|dimension|width|length)\b/i.test(reason))
  const patch: MaterialReviewRecommendation["patch"] = {}
  const recommendations: string[] = []

  if (needsThickness && /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard)\b/.test(name)) {
    patch.thickness = /\btype\s*x\b/.test(name) ? "5/8 in." : "1/2 in."
    recommendations.push(`${patch.thickness} thickness`)
  } else if (needsThickness && /\b(?:cement\s+board|wonderboard)\b/.test(name)) {
    patch.thickness = "1/2 in."
    recommendations.push("1/2 in. thickness")
  }

  if (needsSize && /\b(?:drywall|sheetrock|gypsum|greenboard|blueboard)\b/.test(name)) {
    patch.dimensions = "4 x 8 ft."
    recommendations.push("4 x 8 ft. sheets")
  }

  if (recommendations.length) {
    return {
      label: `Suggested: ${recommendations.join(" · ")}`,
      note: "Common residential choice. Confirm the plans or client requirements before marking it ready.",
      patch,
    }
  }

  return {
    label: `Ask the client: ${reasons.join("; ")}`,
    note: "No reliable standard value can be selected without the client or plans.",
    patch,
  }
}

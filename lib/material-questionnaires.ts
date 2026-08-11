export const MATERIAL_QUESTION_TYPES = [
  "single_select",
  "multi_select",
  "yes_no",
  "short_text",
  "long_text",
  "number",
  "quantity",
  "square_feet",
  "linear_feet",
  "gallons",
  "dropdown",
  "file_upload",
  "item_list",
] as const

export type MaterialQuestionType = (typeof MATERIAL_QUESTION_TYPES)[number]
export type MaterialConditionalOperator = "equals" | "not_equals" | "includes_any" | "includes_all" | "is_answered"
export type MaterialLineItem = { size: string; length: string; quantity: number }
export type MaterialAnswerValue = string | number | string[] | { selected?: string | string[]; value?: number; unit?: string; notes?: string; other?: string; attachmentIds?: string[]; items?: MaterialLineItem[] } | null

export type MaterialQuestionOption = {
  id: string
  question_id: string
  label: string
  value: string
  is_active: boolean
  sort_order: number
}

export type MaterialQuestion = {
  id: string
  category_id: string
  question_key: string
  label: string
  help_text: string
  placeholder: string
  question_type: MaterialQuestionType
  unit: string | null
  is_required: boolean
  is_active: boolean
  sort_order: number
  allow_other: boolean
  conditional_parent_question_id: string | null
  conditional_operator: MaterialConditionalOperator | null
  conditional_value: unknown
  configuration: { units?: string[]; allowNotes?: boolean; maxFiles?: number; itemSizes?: string[]; itemLengths?: string[] }
  options: MaterialQuestionOption[]
}

export type MaterialQuestionnaireCategory = {
  id: string
  name: string
  slug: string
  department_key: string
  description: string
  is_active: boolean
  sort_order: number
  current_version: number
  settings: { defaultWastePercentage?: number }
  questions: MaterialQuestion[]
}

export type MaterialQuestionnaireSnapshot = {
  category: Pick<MaterialQuestionnaireCategory, "id" | "name" | "slug" | "department_key" | "description" | "current_version">
  questions: MaterialQuestion[]
}

export type MaterialQuestionnaireResponse = {
  id: string
  request_id: string
  project_id: string
  owner_id: string
  category_id: string | null
  category_name_snapshot: string
  category_slug_snapshot: string
  definition_version: number
  definition_snapshot: MaterialQuestionnaireSnapshot
  status: "in_progress" | "complete"
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type MaterialRequestAnswer = {
  id?: string
  response_id: string
  question_id: string | null
  question_key: string
  question_label_snapshot: string
  question_type_snapshot: MaterialQuestionType
  answer_value: MaterialAnswerValue
  answer_display_snapshot: string
  unit_snapshot: string | null
}

export const MATERIAL_DEPARTMENTS = [
  "Framing",
  "Tile work",
  "Sheet rock",
  "Door and molding",
  "Wood Floor",
  "Siding",
  "Roofing",
  "Window",
] as const

export const MATERIAL_QUESTION_TYPE_LABELS: Record<MaterialQuestionType, string> = {
  single_select: "Single-select cards",
  multi_select: "Multi-select cards",
  yes_no: "Yes / No",
  short_text: "Short text",
  long_text: "Long text / notes",
  number: "Number",
  quantity: "Quantity with unit",
  square_feet: "Square feet",
  linear_feet: "Linear feet",
  gallons: "Gallons",
  dropdown: "Dropdown",
  file_upload: "File or plan upload",
  item_list: "Repeatable item rows",
}

export function buildMaterialQuestionnaireSnapshot(category: MaterialQuestionnaireCategory): MaterialQuestionnaireSnapshot {
  return {
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      department_key: category.department_key,
      description: category.description,
      current_version: category.current_version,
    },
    questions: category.questions
      .filter((question) => question.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((question) => ({
        ...question,
        options: question.options.filter((option) => option.is_active).sort((a, b) => a.sort_order - b.sort_order),
      })),
  }
}

export function isQuestionVisible(question: MaterialQuestion, answers: Record<string, MaterialAnswerValue>) {
  if (!question.conditional_parent_question_id || !question.conditional_operator) return true
  const rawValue = answers[question.conditional_parent_question_id]
  const value = typeof rawValue === "object" && rawValue && !Array.isArray(rawValue) && rawValue.selected !== undefined ? rawValue.selected : rawValue
  const expected = question.conditional_value

  if (question.conditional_operator === "is_answered") {
    return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0)
  }
  if (question.conditional_operator === "equals") return value === expected
  if (question.conditional_operator === "not_equals") return value !== expected

  const actualValues = Array.isArray(value) ? value : value === null || value === undefined ? [] : [String(value)]
  const expectedValues = Array.isArray(expected) ? expected.map(String) : [String(expected ?? "")]
  if (question.conditional_operator === "includes_any") return expectedValues.some((entry) => actualValues.includes(entry))
  return expectedValues.every((entry) => actualValues.includes(entry))
}

export function hasMaterialAnswer(value: MaterialAnswerValue) {
  if (value === null || value === undefined || value === "") return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") {
    return Boolean(value.selected || value.value || value.unit || value.notes?.trim() || value.other?.trim() || value.attachmentIds?.length || value.items?.some((item) => item.size && item.length && item.quantity > 0))
  }
  return true
}

export function hasCompleteMaterialAnswer(question: MaterialQuestion, value: MaterialAnswerValue) {
  if (!hasMaterialAnswer(value)) return false
  const selected = typeof value === "object" && value && !Array.isArray(value) ? value.selected : value
  const selectedValues = Array.isArray(selected) ? selected : typeof selected === "string" ? [selected] : []
  if (question.allow_other && selectedValues.includes("other")) {
    return Boolean(typeof value === "object" && value && !Array.isArray(value) && value.other?.trim())
  }
  if (["number", "square_feet", "linear_feet", "gallons"].includes(question.question_type)) {
    return typeof value === "number" ? Number.isFinite(value) && value > 0 : Number(value) > 0
  }
  if (question.question_type === "quantity") {
    return Boolean(typeof value === "object" && value && !Array.isArray(value) && Number(value.value) > 0)
  }
  if (question.question_type === "item_list") {
    return Boolean(typeof value === "object" && value && !Array.isArray(value) && value.items?.length && value.items.every((item) => item.size && item.length && Number(item.quantity) > 0))
  }
  return true
}

export function formatMaterialAnswer(question: MaterialQuestion, value: MaterialAnswerValue) {
  if (!hasMaterialAnswer(value)) return ""
  if (Array.isArray(value)) {
    return value.map((entry) => question.options.find((option) => option.value === entry)?.label ?? entry).join(", ")
  }
  if (typeof value === "object" && value) {
    const selected = Array.isArray(value.selected)
      ? value.selected.map((entry) => question.options.find((option) => option.value === entry)?.label ?? entry).join(", ")
      : value.selected ? question.options.find((option) => option.value === value.selected)?.label ?? value.selected : ""
    const formattedValue = typeof value.value === "number" ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value.value) : value.value
    const parts = [selected, formattedValue, value.unit, value.other, value.notes].filter((entry) => entry !== undefined && entry !== "")
    if (value.attachmentIds?.length) parts.push(`${value.attachmentIds.length} file${value.attachmentIds.length === 1 ? "" : "s"}`)
    if (value.items?.length) parts.push(value.items.map((item) => `${item.size} x ${item.length} - ${item.quantity}`).join("; "))
    return parts.join(" ")
  }
  if (typeof value === "string") {
    return question.options.find((option) => option.value === value)?.label ?? value
  }
  const formatted = typeof value === "number" ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) : value
  return `${formatted}${question.unit ? ` ${question.unit}` : ""}`
}

export function slugifyMaterialCategory(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
}

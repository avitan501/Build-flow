export type QuoteRequestStatus = "draft" | "submitted" | "in_review" | "quoted" | "closed"

export type QuoteRequestRecord = {
  id: string
  project_id: string
  owner_id: string
  title: string
  status: QuoteRequestStatus
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type QuoteRequestAnswer = {
  questionId: string
  label: string
  value: string
}

export type QuoteRequestItemRecord = {
  id: string
  request_id: string
  project_id: string
  owner_id: string
  catalog_item_id: string | null
  name: string
  department: string
  item_type: "material" | "service" | "file_upload" | "custom_priced"
  quantity: number
  unit: string | null
  unit_price: number
  qualification_status: "not_required" | "pending" | "answered" | "skipped"
  answers: QuoteRequestAnswer[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ProjectQuestionRecord = {
  id: string
  label: string
  question_type: "text" | "textarea" | "select" | "date" | "time"
  required: boolean
  options: string[]
  active: boolean
  sort_order: number
}

export type ProjectQuestionAnswerRecord = {
  project_id: string
  question_id: string
  owner_id: string
  value: string
}

export function quoteRequestStatusLabel(status: QuoteRequestStatus) {
  if (status === "in_review") return "In Review"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function quoteRequestStatusClass(status: QuoteRequestStatus) {
  if (status === "draft") return "border-slate-200 bg-slate-50 text-slate-700"
  if (status === "submitted") return "border-sky-200 bg-sky-50 text-sky-700"
  if (status === "in_review") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "quoted") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  return "border-violet-200 bg-violet-50 text-violet-700"
}

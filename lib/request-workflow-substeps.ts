import type { ManagerPipelineStage } from "@/lib/manager-dashboard"
import type { QuoteRequestStatus } from "@/lib/quote-requests"

export type RequestWorkflowStepNumber = 1 | 2 | 3
export type RequestWorkflowSubstepId =
  | "request-received"
  | "ai-organized"
  | "supplier-route"
  | "suppliers-chosen"
  | "requests-sent"
  | "quotes-received"
  | "route-selected"
  | "estimate"
  | "client-approval"
  | "invoice"
  | "payment"
  | "delivery"

export type RequestWorkflowSubstep = {
  id: RequestWorkflowSubstepId
  step: RequestWorkflowStepNumber
  label: string
  pipelineStage: ManagerPipelineStage
  minimumRequestStatus: QuoteRequestStatus
}

export const REQUEST_WORKFLOW_SUBSTEPS: readonly RequestWorkflowSubstep[] = [
  { id: "request-received", step: 1, label: "Received", pipelineStage: "received", minimumRequestStatus: "submitted" },
  { id: "ai-organized", step: 1, label: "AI organized", pipelineStage: "received", minimumRequestStatus: "submitted" },
  { id: "supplier-route", step: 1, label: "Supplier route", pipelineStage: "pricing", minimumRequestStatus: "submitted" },
  { id: "suppliers-chosen", step: 2, label: "Suppliers", pipelineStage: "pricing", minimumRequestStatus: "submitted" },
  { id: "requests-sent", step: 2, label: "Requests sent", pipelineStage: "pricing", minimumRequestStatus: "submitted" },
  { id: "quotes-received", step: 2, label: "Quotes received", pipelineStage: "pricing", minimumRequestStatus: "submitted" },
  { id: "route-selected", step: 2, label: "Route selected", pipelineStage: "approval", minimumRequestStatus: "in_review" },
  { id: "estimate", step: 3, label: "Estimate", pipelineStage: "approval", minimumRequestStatus: "in_review" },
  { id: "client-approval", step: 3, label: "Approval", pipelineStage: "approval", minimumRequestStatus: "in_review" },
  { id: "invoice", step: 3, label: "Invoice", pipelineStage: "delivery", minimumRequestStatus: "in_review" },
  { id: "payment", step: 3, label: "Payment", pipelineStage: "delivery", minimumRequestStatus: "in_review" },
  { id: "delivery", step: 3, label: "Delivery", pipelineStage: "delivery", minimumRequestStatus: "in_review" },
] as const

export function requestWorkflowSubsteps(step: RequestWorkflowStepNumber) {
  return REQUEST_WORKFLOW_SUBSTEPS.filter((substep) => substep.step === step)
}

export function requestWorkflowSubstep(value: unknown) {
  return REQUEST_WORKFLOW_SUBSTEPS.find((substep) => substep.id === value) ?? null
}

export function requestWorkflowSubstepLabel(value: unknown) {
  return requestWorkflowSubstep(value)?.label ?? null
}

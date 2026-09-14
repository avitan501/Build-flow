export type RequestStep = 1 | 2 | 3
export type StepAssignee = "carlos" | "david"
export type RequestStepRecord = {
  request_id: string
  step: RequestStep
  assignee: StepAssignee
  note: string
  completed_override: boolean | null
  revision: number
}
export type RequestStepPatch = { assignee?: StepAssignee; note?: string; completed_override?: boolean }
export type RequestStepState = RequestStepRecord & { completed: boolean; eligible: boolean }

export function deriveRequestSteps(input: {
  requestId: string
  assignee: string
  records: RequestStepRecord[]
  eligible: [boolean, boolean, boolean]
  legacyCompleted: [boolean, boolean, boolean]
}): RequestStepState[] {
  return ([1, 2, 3] as const).map((step, index) => {
    const saved = input.records.find(row => row.step === step)
    return {
      request_id: input.requestId,
      step,
      assignee: saved?.assignee || (input.assignee === "david" ? "david" : "carlos"),
      note: saved?.note || "",
      completed_override: saved?.completed_override ?? null,
      revision: saved?.revision || 0,
      eligible: input.eligible[index],
      completed: input.eligible[index] && (saved?.completed_override ?? input.legacyCompleted[index]),
    }
  })
}

export function requestStepAttention(steps: RequestStepState[]) {
  const next = steps.find(step => !step.completed)
  return next ? { step: next.step, assignee: next.assignee, label: `With ${next.assignee === "david" ? "David" : "Carlos"} · Step ${next.step}` } : { step: 3 as const, assignee: null, label: "All steps done" }
}

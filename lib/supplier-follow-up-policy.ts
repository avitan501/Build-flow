export type SupplierFollowUpAction = "follow_up_1" | "follow_up_2" | "no_response" | null

export function supplierFollowUpAction(input: {
  cutoff: string
  firstReminderAt?: string
  secondReminderAt?: string
  outboundActivity: string[]
}): SupplierFollowUpAction {
  if (!input.firstReminderAt) return "follow_up_1"
  const afterFirst = input.outboundActivity.filter((occurredAt) => occurredAt > input.firstReminderAt!).sort()
  if (!input.secondReminderAt) {
    const latestFirstFollowUpAt = afterFirst.at(-1)
    return latestFirstFollowUpAt && latestFirstFollowUpAt < input.cutoff ? "follow_up_2" : null
  }
  const latestSecondFollowUpAt = input.outboundActivity
    .filter((occurredAt) => occurredAt > input.secondReminderAt!)
    .sort()
    .at(-1)
  return latestSecondFollowUpAt && latestSecondFollowUpAt < input.cutoff ? "no_response" : null
}

export function requestDeliveryCoverage(events: Array<Record<string, unknown> | null | undefined>, currentItemIds: string[]) {
  const requested = new Set(currentItemIds.filter(Boolean))
  const scheduled = new Set<string>()
  let hasSchedule = false
  for (const event of events) {
    if (event?.client_action !== "delivery_scheduled") continue
    hasSchedule = true
    for (const id of Array.isArray(event.delivery_item_ids) ? event.delivery_item_ids : []) if (typeof id === "string" && requested.has(id)) scheduled.add(id)
  }
  return { complete: requested.size > 0 && scheduled.size === requested.size, scheduledCount: scheduled.size, totalCount: requested.size, scheduledItemIds: [...scheduled], hasSchedule }
}

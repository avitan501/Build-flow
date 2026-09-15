import { dailyWorkDateKey } from "./daily-work-summary"

/** Presentation only. Never supplies a checkout or changes payable duration. */
export function needsHistoricalCheckoutReview(
  summary: { date: string; checkInAt?: string | null; checkOutAt?: string | null },
  now: Date | string | number,
) {
  const today = dailyWorkDateKey(now)
  return Boolean(today && summary.checkInAt && !summary.checkOutAt && summary.date < today)
}

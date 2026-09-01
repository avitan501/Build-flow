export type ManagerGoalStatus = "open" | "completed" | "archived"

export const SYSTEM_GOAL_STATUS_PREFIX = "system_goal_status:"

export const CARLOS_FIXED_GOALS = {
  "client-target": "Client Target",
  "supplier-affiliate-program": "Build Supplier Network",
  "supplier-partnerships": "Supplier Partnership",
  "abc-supply-demo": "ABC Supply Demo",
} as const

export type CarlosFixedGoalKey = keyof typeof CARLOS_FIXED_GOALS

export function fixedGoalKey(details: string | null | undefined): CarlosFixedGoalKey | null {
  if (!details?.startsWith(SYSTEM_GOAL_STATUS_PREFIX)) return null
  const key = details.slice(SYSTEM_GOAL_STATUS_PREFIX.length)
  return key in CARLOS_FIXED_GOALS ? key as CarlosFixedGoalKey : null
}

export const DASHBOARD_AI_HISTORY_PREFIX = "dashboard_ai_history_v1:"
export const EMPLOYEE_ACTIVITY_PREFIX = "employee_activity_v1:"
export const COMMUNICATION_LOG_PREFIX = "communication_log_v1:"
export const TODAY_TASK_PREFIX = "today_task:"

export type DashboardAiHistoryItem = {
  id: string
  query: string
  answer: string
  createdAt: string
}

export type EmployeeActivity = {
  path: string
  pageLabel: string
  lastSeenAt: string
}

export type CommunicationLog = {
  id: string
  clientId: string
  clientName: string
  channel: "call" | "whatsapp"
  direction: "outbound" | "inbound"
  summary: string
  outcome: string
  createdAt: string
}

function parsePrefixedJson<T>(value: string | null | undefined, prefix: string): T | null {
  if (!value?.startsWith(prefix)) return null
  try {
    return JSON.parse(value.slice(prefix.length)) as T
  } catch {
    return null
  }
}

export function parseDashboardAiHistory(value: string | null | undefined) {
  const parsed = parsePrefixedJson<DashboardAiHistoryItem[]>(value, DASHBOARD_AI_HISTORY_PREFIX)
  return Array.isArray(parsed) ? parsed.slice(0, 20) : []
}

export function serializeDashboardAiHistory(items: DashboardAiHistoryItem[]) {
  return `${DASHBOARD_AI_HISTORY_PREFIX}${JSON.stringify(items.slice(0, 20))}`
}

export function parseEmployeeActivity(value: string | null | undefined) {
  return parsePrefixedJson<EmployeeActivity>(value, EMPLOYEE_ACTIVITY_PREFIX)
}

export function serializeEmployeeActivity(activity: EmployeeActivity) {
  return `${EMPLOYEE_ACTIVITY_PREFIX}${JSON.stringify(activity)}`
}

export function parseCommunicationLog(value: string | null | undefined) {
  return parsePrefixedJson<CommunicationLog>(value, COMMUNICATION_LOG_PREFIX)
}

export function serializeCommunicationLog(log: CommunicationLog) {
  return `${COMMUNICATION_LOG_PREFIX}${JSON.stringify(log)}`
}

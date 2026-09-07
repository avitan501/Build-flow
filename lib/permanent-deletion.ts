import "server-only"

const PRODUCTION_DELETE_FLAG = "ALLOW_PERMANENT_DATA_DELETION"

export const PERMANENT_DELETION_BLOCKED_MESSAGE =
  "Permanent deletion is protected. Keep this record, close or archive it instead, or ask an administrator to open a supervised deletion window after a backup."

export function permanentDeletionIsEnabled() {
  if (process.env.NODE_ENV !== "production") return true
  return process.env[PRODUCTION_DELETE_FLAG]?.trim().toLowerCase() === "true"
}

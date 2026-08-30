export function canRunSmsReplyLab(access: { aiTools?: boolean; customers?: boolean }) {
  return access.aiTools === true && access.customers === true
}

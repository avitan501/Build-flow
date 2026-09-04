export const CARLOS_WORK_BROWSER_ACK_TITLE = "Carlos work browser monitoring acknowledgement"
export const CARLOS_WORK_BROWSER_ACK_PREFIX = "carlos_work_browser_ack_v1:"
export const CARLOS_WORK_BROWSER_POLICY_VERSION = "2026-09-04"
export const CARLOS_WORK_BROWSER_EMAIL = "buildavantiap@gmail.com"

export type CarlosWorkBrowserAcknowledgement = {
  acknowledgedAt: string
  policyVersion: string
  statement: string
}

export const CARLOS_WORK_BROWSER_STATEMENT =
  "I understand that this company-owned work browser is for Avantia Build business only and may be viewed and monitored by management at any time. I will not use it for personal accounts or personal activity."

export function serializeCarlosWorkBrowserAcknowledgement(value: CarlosWorkBrowserAcknowledgement) {
  return `${CARLOS_WORK_BROWSER_ACK_PREFIX}${JSON.stringify(value)}`
}

export function parseCarlosWorkBrowserAcknowledgement(value: string | null | undefined) {
  if (!value?.startsWith(CARLOS_WORK_BROWSER_ACK_PREFIX)) return null
  try {
    const parsed = JSON.parse(value.slice(CARLOS_WORK_BROWSER_ACK_PREFIX.length)) as Partial<CarlosWorkBrowserAcknowledgement>
    if (typeof parsed.acknowledgedAt !== "string" || Number.isNaN(Date.parse(parsed.acknowledgedAt))) return null
    if (parsed.policyVersion !== CARLOS_WORK_BROWSER_POLICY_VERSION) return null
    if (parsed.statement !== CARLOS_WORK_BROWSER_STATEMENT) return null
    return parsed as CarlosWorkBrowserAcknowledgement
  } catch {
    return null
  }
}

const DEFAULT_CARLOS_BROWSER_ORIGIN = "https://ubuntu-16gb-hil-3.tailc90016.ts.net:8443"

export function carlosWorkBrowserUrl(viewOnly: boolean) {
  const origin = String(process.env.CARLOS_WORK_BROWSER_URL || DEFAULT_CARLOS_BROWSER_ORIGIN).replace(/\/+$/, "")
  const query = new URLSearchParams({
    autoconnect: "1",
    reconnect: "1",
    resize: "scale",
    view_only: viewOnly ? "1" : "0",
  })
  return `${origin}/vnc.html?${query.toString()}`
}

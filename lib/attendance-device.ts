export const DESKTOP_ATTENDANCE_MESSAGE = "Clock in and clock out are available on a computer only. You can still view hours, write your summary, and request pay on your phone."

// Device-class policy, not device attestation: user agents can be spoofed.
export function isAttendanceComputer(userAgent: string | null | undefined, mobileHint?: string | boolean | null, maxTouchPoints = 0) {
  const ua = (userAgent || "").slice(0, 1024)
  if (mobileHint === true || mobileHint === "?1") return false
  if (/android|iphone|ipad|ipod|mobile|tablet|silk|kindle|playbook|blackberry|bb10|iemobile|opera mini/i.test(ua)) return false
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return false
  return /windows nt|macintosh|x11|cros|linux (x86_64|i[3-6]86|aarch64)/i.test(ua)
}

export function attendanceNeedsComputer(action: string) {
  return action === "check_in" || action === "check_out"
}

export const PRODUCTION_SITE_ORIGIN = "https://build.avantiap.com"

export function authRedirectOrigin() {
  if (typeof window === "undefined") return PRODUCTION_SITE_ORIGIN

  const hostname = window.location.hostname
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app")
  ) {
    return window.location.origin
  }

  return PRODUCTION_SITE_ORIGIN
}

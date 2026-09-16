// Server-to-server only: never accept a publishable/anon key or a decoded JWT role.
export function authorizedRecognitionServer(headers: Headers, env: (name: string) => string | undefined) {
  const allowed = new Set<string>()
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) {
    const key = env(name)?.trim()
    if (key) allowed.add(key)
  }
  try {
    const keys: unknown = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}")
    if (keys && typeof keys === "object" && !Array.isArray(keys)) {
      for (const key of Object.values(keys)) {
        if (typeof key === "string" && key.startsWith("sb_secret_")) allowed.add(key)
      }
    }
  } catch { /* Invalid configuration fails closed. */ }
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const apiKey = headers.get("apikey")
  return Boolean((bearer && allowed.has(bearer)) || (apiKey && allowed.has(apiKey)))
}

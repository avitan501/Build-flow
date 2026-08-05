import { getSupabasePublicEnv } from "@/lib/supabase/env"

export function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("pkce") || normalized.includes("code verifier")) {
    return "That sign-in attempt expired. Start again on this page."
  }

  if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
    return "That login option is not available yet. Use email or phone instead."
  }

  return message
}

export async function isGoogleAuthEnabled() {
  try {
    const { url, anonKey } = getSupabasePublicEnv()
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    })
    if (!response.ok) return false
    const settings = await response.json() as { external?: { google?: boolean } }
    return settings.external?.google === true
  } catch {
    return false
  }
}

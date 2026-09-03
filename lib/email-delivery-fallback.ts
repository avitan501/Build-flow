export type EmailDeliveryAttempt =
  | { status: "sent"; providerId: string | null }
  | { status: "not_configured" }
  | { status: "skipped" }
  | { status: "failed"; error: string }

type SupabaseEmailFallbackResponse = {
  data: { ok?: boolean; providerId?: string | null; error?: string } | null
  error: { message?: string; context?: unknown } | null
}

export type RoutedEmailDelivery = EmailDeliveryAttempt & {
  route: "website-direct" | "supabase-fallback"
}

async function fallbackErrorDetail(response: SupabaseEmailFallbackResponse) {
  if (response.data?.error) return response.data.error
  if (response.error?.context instanceof Response) {
    try {
      const body = await response.error.context.clone().json() as { error?: unknown } | null
      if (typeof body?.error === "string" && body.error.trim()) return body.error.trim()
    } catch {
      // Fall through to the SDK's transport error when no JSON body is available.
    }
  }
  return response.error?.message
}

function fallbackFailureMessage(detail?: string) {
  if (detail === "email_provider_not_configured") return "Supabase email fallback is not configured."
  return detail
    ? `Supabase email fallback failed: ${detail}`
    : "Website direct email is not configured, and the Supabase email fallback did not confirm delivery."
}

/**
 * Uses the authenticated Supabase email function only when the website has no
 * direct provider key. Provider failures do not fall through because the
 * provider may have accepted the message before returning an ambiguous error.
 */
export async function deliverEmailWithSupabaseFallback(
  directSend: () => Promise<EmailDeliveryAttempt>,
  fallbackSend: () => PromiseLike<SupabaseEmailFallbackResponse>,
): Promise<RoutedEmailDelivery> {
  const direct = await directSend()
  if (direct.status !== "not_configured") return { ...direct, route: "website-direct" }

  try {
    const fallback = await fallbackSend()
    if (!fallback.error && fallback.data?.ok) {
      return {
        status: "sent",
        providerId: fallback.data.providerId ?? null,
        route: "supabase-fallback",
      }
    }

    const detail = await fallbackErrorDetail(fallback)
    return {
      status: "failed",
      error: fallbackFailureMessage(detail),
      route: "supabase-fallback",
    }
  } catch (error) {
    return {
      status: "failed",
      error: `Supabase email fallback could not be reached: ${error instanceof Error ? error.message : "Unknown error"}`,
      route: "supabase-fallback",
    }
  }
}

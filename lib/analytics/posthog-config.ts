// PostHog project tokens are public ingestion identifiers (the browser sends
// them with every event), not account-management secrets. Keep the production
// project as a safe fallback because build.avantiap.com's Vercel project is
// deployed through an owner-scoped hook whose environment cannot be edited by
// this workspace. An explicit environment value still takes precedence.
export const POSTHOG_PROJECT_TOKEN =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
  "phc_rQaZe6MjacY8Y2QrUcTVpdcK6VtZS6z3K2JRT4URfcTo";

export const POSTHOG_API_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

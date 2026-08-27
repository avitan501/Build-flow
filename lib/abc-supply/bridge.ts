import "server-only";

import { createClient } from "@/lib/supabase/server";

// Keep ABC isolated from unrelated Build Flow preview promotions. The branch
// alias only advances when the dedicated ABC bridge branch is deployed.
const ABC_BRIDGE_URL = process.env.ABC_BRIDGE_URL
  || "https://build-flow-wfl3-git-codex-abc-7d0632-avitanneto-1804s-projects.vercel.app/api/integrations/abc/bridge";

export function getAbcBridgeCallbackUrl(searchParams: URLSearchParams) {
  const callbackUrl = new URL(ABC_BRIDGE_URL);
  if (callbackUrl.protocol !== "https:") throw new Error("ABC bridge must use HTTPS.");
  if (!/\/bridge\/?$/.test(callbackUrl.pathname)) throw new Error("ABC bridge callback is not configured.");
  callbackUrl.pathname = callbackUrl.pathname.replace(/\/bridge\/?$/, "/callback");
  callbackUrl.search = searchParams.toString();
  return callbackUrl;
}

export async function callAbcBridge(body: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to Avantia Build again.");

  const response = await fetch(ABC_BRIDGE_URL, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(50_000),
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "ABC pricing is temporarily unavailable.";
    throw new Error(message);
  }
  return payload;
}

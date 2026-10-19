import "server-only";
import { setTimeout as delay } from "node:timers/promises";

// Called only after a newly saved response. The mail service reads the original
// record and fixes the recipient to the owner; no client-supplied email payload.
export async function notifyOwner(id: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("client_questionnaire_notification_not_configured"); return; }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${url}/functions/v1/client-questionnaire-notify`, {
        method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ id }), cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (response.ok && (await response.json()).ok === true) return;
      if (response.status < 500 && response.status !== 429) break;
    } catch { /* Retry with the same receipt; the provider deduplicates delivery. */ }
    if (attempt < 2) await delay(500 * (attempt + 1));
  }
  console.error("client_questionnaire_notification_failed", { receipt: id });
}

type Environment = { get(name: string): string | undefined };
const inbox = "https://avantiabuild.com/owner/service-planner/client-responses";
const ownerEmail = "avitanneto@gmail.com";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

// This endpoint accepts only the existing server service-role credential. No public
// recipient, subject or message parameters are accepted; content comes from storage.
export async function handleNotification(request: Request, env: Environment): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const legacyKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  let secretKeys: string[] = [];
  try { secretKeys = Object.values(JSON.parse(env.get("SUPABASE_SECRET_KEYS") || "{}")).filter((value): value is string => typeof value === "string" && value.length > 0); }
  catch { return json({ error: "not_configured" }, 503); }
  const allowedKeys = [...secretKeys, legacyKey].filter((value): value is string => Boolean(value));
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const apiKeyHeader = request.headers.get("apikey") || "";
  if (!allowedKeys.some(key => token === key || apiKeyHeader === key)) return json({ error: "forbidden" }, 403);
  const serviceKey = secretKeys[0] || legacyKey!;
  let id: string;
  try {
    const raw = await request.text();
    if (raw.length > 200) return json({ error: "invalid_request" }, 400);
    const body = JSON.parse(raw);
    if (!body || Object.keys(body).length !== 1 || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) return json({ error: "invalid_request" }, 400);
    id = body.id;
  } catch { return json({ error: "invalid_request" }, 400); }
  const url = env.get("SUPABASE_URL");
  const apiKey = env.get("RESEND_API_KEY");
  if (!url || !apiKey) return json({ error: "not_configured" }, 503);
  try {
    const saved = await fetch(`${url}/rest/v1/client_questionnaire_submissions?id=eq.${id}&select=id,created_at,state`, {
      headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey }, signal: AbortSignal.timeout(5000),
    });
    if (!saved.ok) return json({ error: "storage_unavailable" }, 503);
    const [row] = await saved.json();
    if (!row) return json({ error: "not_found" }, 404);
    // Provider deduplication lasts 24 hours. Never replay an old receipt after that window.
    const age = Date.now() - Date.parse(row.created_at);
    if (!Number.isFinite(age) || age < -300000 || age > 23 * 60 * 60 * 1000) return json({ error: "notification_expired" }, 409);
    id = row.id; // Canonical stored UUID keeps the deduplication key stable.
    const profile = row.state.profile;
    const details = [
      `Name: ${profile.name}`, profile.company && `Company: ${profile.company}`,
      profile.email && `Email: ${profile.email}`, profile.phone && `Phone: ${profile.phone}`,
    ].filter(Boolean) as string[];
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(7000),
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "Idempotency-Key": `client-questionnaire/${id}` },
      body: JSON.stringify({
        from: env.get("QUOTE_SUBMISSION_FROM") || "Avantia Build Requests <onboarding@resend.dev>",
        to: [ownerEmail], subject: "New client questionnaire — Avantia Build",
        text: `A client completed your questionnaire. Their answers are saved in your private Client responses inbox.\n\n${details.join("\n")}\n\nOpen Client responses (owner sign-in required):\n${inbox}\n\nReference: ${id}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h1 style="font-size:22px">New client questionnaire</h1><p>A client completed your questionnaire. Their answers are saved in your private Client responses inbox.</p><p>${details.map(escapeHtml).join("<br>")}</p><p><a href="${inbox}">Open Client responses</a></p><p>Owner sign-in required.</p><p style="font-size:12px">Reference: ${id}</p></div>`,
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.id !== "string") {
      // Never expose provider messages, credentials or client details in logs/responses.
      return json({ error: "email_unavailable" }, response.status === 429 || response.status >= 500 ? 503 : 502);
    }
    return json({ ok: true });
  } catch { return json({ error: "notification_unavailable" }, 503); }
}

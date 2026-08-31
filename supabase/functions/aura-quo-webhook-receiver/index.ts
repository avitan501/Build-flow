import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const databaseUrl = Deno.env.get("SUPABASE_DB_URL") || "";
const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 3,
  prepare: false,
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function constantTimeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1)
    mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function validSignature(
  rawBody: string,
  header: string | null,
  secret: string,
) {
  if (!header || !secret) return false;
  const [scheme, version, timestamp, suppliedDigest] = header.split(";");
  if (scheme !== "hmac" || version !== "1" || !timestamp || !suppliedDigest)
    return false;
  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase64(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return constantTimeEqual(expected, suppliedDigest);
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  if (!databaseUrl) return json({ error: "Receiver not configured" }, 503);

  const rawBody = await request.text();
  const secrets = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'aura_quo_webhook_signing_secret'
    limit 1
  `;
  if (
    !(await validSignature(
      rawBody,
      request.headers.get("openphone-signature"),
      secrets[0]?.decrypted_secret || "",
    ))
  ) {
    return json({ error: "Invalid signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const eventId = typeof payload.id === "string" ? payload.id.trim() : "";
  const eventType = typeof payload.type === "string" ? payload.type.trim() : "";
  const data = payload.data as { object?: Record<string, unknown> } | undefined;
  const object = data?.object;
  const activityId = typeof object?.id === "string" ? object.id.trim() : "";
  if (
    !eventId ||
    payload.object !== "event" ||
    eventType !== "message.received" ||
    !activityId
  ) {
    return json({ error: "Unsupported event" }, 400);
  }

  await sql`
    insert into public.aura_webhook_events
      (provider, external_event_id, event_type, activity_id, raw_payload, error_message)
    values
      ('quo', ${eventId}, ${eventType}, ${activityId}, ${sql.json(payload)}, null)
    on conflict (provider, external_event_id) do nothing
  `;

  return json({ ok: true, accepted: true }, 202);
});

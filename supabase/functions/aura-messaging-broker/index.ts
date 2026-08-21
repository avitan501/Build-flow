import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
const serviceKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const OWNER_EMAIL = "avitanneto@gmail.com";

const secretNames = {
  twilioSid: "aura_twilio_account_sid",
  twilioToken: "aura_twilio_auth_token",
  twilioFrom: "aura_twilio_whatsapp_from",
  quoKey: "aura_quo_api_key",
  quoFrom: "aura_quo_from_number",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" },
  });
}

function twiml(status = 200) {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/xml; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

function normalizePhone(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";
  const digits = input.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function secret(name: string) {
  const rows = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret from vault.decrypted_secrets where name = ${name} limit 1
  `;
  return rows[0]?.decrypted_secret || null;
}

async function saveSecret(name: string, value: string, description: string) {
  const rows = await sql<{ id: string }[]>`select id from vault.secrets where name = ${name} limit 1`;
  if (rows[0]?.id) {
    await sql`select vault.update_secret(${rows[0].id}::uuid, ${value}, ${name}, ${description})`;
  } else {
    await sql`select vault.create_secret(${value}, ${name}, ${description})`;
  }
}

async function requireOwner(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user || data.user.email?.trim().toLowerCase() !== OWNER_EMAIL) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("role, approval_status, is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin" || profile.approval_status !== "approved" || profile.is_active !== true) return null;
  return data.user;
}

async function twilioConfig() {
  const [accountSid, authToken, from] = await Promise.all([
    secret(secretNames.twilioSid),
    secret(secretNames.twilioToken),
    secret(secretNames.twilioFrom),
  ]);
  return accountSid && authToken && from ? { accountSid, authToken, from } : null;
}

async function quoConfig() {
  const [apiKey, from] = await Promise.all([secret(secretNames.quoKey), secret(secretNames.quoFrom)]);
  return apiKey && from ? { apiKey, from } : null;
}

async function hmacSha1Base64(key: string, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function validTwilioSignature(url: string, params: URLSearchParams, supplied: string | null, token: string) {
  if (!supplied || !url.startsWith("https://build.avantiap.com/")) return false;
  const entries = [...params.entries()].sort(([left], [right]) => left.localeCompare(right));
  const payload = entries.reduce((value, [key, item]) => `${value}${key}${item}`, url);
  return constantTimeEqual(await hmacSha1Base64(token, payload), supplied);
}

async function contactId(phone: string | null) {
  if (!phone) return null;
  const rows = await sql<{ id: string }[]>`
    select id from public.aura_contacts where normalized_phone = ${phone} limit 1
  `;
  return rows[0]?.id || null;
}

async function storeCommunication(input: {
  provider: "whatsapp" | "quo";
  channel: "whatsapp" | "sms";
  externalId: string;
  direction: "incoming" | "outgoing";
  counterpartyPhone: string | null;
  businessPhone: string | null;
  body: string | null;
  status: string;
  media?: Array<{ url?: string; type?: string }>;
}) {
  const now = new Date().toISOString();
  const linkedContact = await contactId(input.counterpartyPhone);
  await sql`
    insert into public.aura_communications (
      provider, channel, external_activity_id, contact_id, direction,
      counterparty_phone, business_phone, body, status, media, occurred_at, last_event_at
    ) values (
      ${input.provider}, ${input.channel}, ${input.externalId}, ${linkedContact}, ${input.direction},
      ${input.counterpartyPhone}, ${input.businessPhone}, ${input.body}, ${input.status},
      ${JSON.stringify(input.media || [])}::jsonb, ${now}, ${now}
    )
    on conflict (provider, external_activity_id) do update set
      status = excluded.status,
      body = coalesce(excluded.body, public.aura_communications.body),
      media = case when excluded.media = '[]'::jsonb then public.aura_communications.media else excluded.media end,
      last_event_at = excluded.last_event_at,
      updated_at = now()
  `;
}

async function handleTwilioWebhook(req: Request) {
  const config = await twilioConfig();
  if (!config) return twiml(503);
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const canonicalUrl = req.headers.get("x-avantia-canonical-url") || "";
  if (!await validTwilioSignature(canonicalUrl, params, req.headers.get("x-twilio-signature"), config.authToken)) {
    return twiml(401);
  }
  const externalId = params.get("MessageSid") || params.get("SmsSid");
  if (!externalId) return twiml(400);
  const status = params.get("MessageStatus") || params.get("SmsStatus") || "received";
  const body = params.get("Body")?.trim() || null;
  const from = normalizePhone((params.get("From") || "").replace(/^whatsapp:/i, ""));
  const to = normalizePhone((params.get("To") || "").replace(/^whatsapp:/i, ""));
  const numMedia = Math.min(10, Math.max(0, Number(params.get("NumMedia") || 0)));
  const media = Array.from({ length: numMedia }, (_, index) => ({
    url: params.get(`MediaUrl${index}`) || undefined,
    type: params.get(`MediaContentType${index}`) || undefined,
  }));
  const incoming = Boolean(body || numMedia > 0);
  if (incoming) {
    await storeCommunication({ provider: "whatsapp", channel: "whatsapp", externalId, direction: "incoming", counterpartyPhone: from, businessPhone: to, body, status, media });
  } else {
    await sql`
      update public.aura_communications set status = ${status}, last_event_at = now(), updated_at = now()
      where provider = 'whatsapp' and external_activity_id = ${externalId}
    `;
  }
  return twiml();
}

async function sendTwilioWhatsApp(toValue: unknown, bodyValue: unknown, canonicalCallbackUrl: string) {
  const config = await twilioConfig();
  if (!config) throw new Error("WhatsApp is not connected.");
  const to = normalizePhone(toValue);
  const body = typeof bodyValue === "string" ? bodyValue.trim().slice(0, 1600) : "";
  if (!to || !body) throw new Error("Enter a valid WhatsApp number and message.");
  const form = new URLSearchParams({
    From: `whatsapp:${config.from}`,
    To: `whatsapp:${to}`,
    Body: body,
    StatusCallback: canonicalCallbackUrl,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const result = await response.json() as { sid?: string; status?: string; message?: string };
  if (!response.ok || !result.sid) throw new Error(result.message || `Twilio returned HTTP ${response.status}.`);
  await storeCommunication({ provider: "whatsapp", channel: "whatsapp", externalId: result.sid, direction: "outgoing", counterpartyPhone: to, businessPhone: config.from, body, status: result.status || "queued" });
  return result.sid;
}

async function sendQuoSms(toValue: unknown, bodyValue: unknown) {
  const config = await quoConfig();
  if (!config) throw new Error("Text messaging is not connected.");
  const to = normalizePhone(toValue);
  const body = typeof bodyValue === "string" ? bodyValue.trim().slice(0, 1600) : "";
  if (!to || !body) throw new Error("Enter a valid phone number and message.");
  const response = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: { Authorization: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ content: body, from: config.from, to: [to] }),
  });
  const result = await response.json() as { data?: { id?: string; status?: string; createdAt?: string }; message?: string };
  if (!response.ok || !result.data?.id) throw new Error(result.message || `Q U O returned HTTP ${response.status}.`);
  await storeCommunication({ provider: "quo", channel: "sms", externalId: result.data.id, direction: "outgoing", counterpartyPhone: to, businessPhone: config.from, body, status: result.data.status || "queued" });
  return result.data.id;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === "POST" && url.searchParams.get("mode") === "twilio-webhook") {
    try { return await handleTwilioWebhook(req); } catch { return twiml(500); }
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const owner = await requireOwner(req);
  if (!owner) return json({ error: "Owner authorization required" }, 401);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  try {
    if (input.action === "status") {
      return json({ ok: true, whatsapp: Boolean(await twilioConfig()), sms: Boolean(await quoConfig()) });
    }
    if (input.action === "configure_twilio") {
      const accountSid = typeof input.accountSid === "string" ? input.accountSid.trim() : "";
      const authToken = typeof input.authToken === "string" ? input.authToken.trim() : "";
      const from = normalizePhone(input.from);
      if (!/^AC[a-f0-9]{32}$/i.test(accountSid) || authToken.length < 20 || !from) return json({ error: "Enter valid Twilio Sandbox credentials." }, 400);
      const validation = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, { headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}` } });
      if (!validation.ok) return json({ error: "Twilio rejected these credentials." }, 400);
      await Promise.all([
        saveSecret(secretNames.twilioSid, accountSid, "Aura Twilio account SID"),
        saveSecret(secretNames.twilioToken, authToken, "Aura Twilio auth token"),
        saveSecret(secretNames.twilioFrom, from, "Aura Twilio WhatsApp sender"),
      ]);
      return json({ ok: true, whatsapp: true });
    }
    if (input.action === "configure_quo") {
      const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
      const from = normalizePhone(input.from);
      if (apiKey.length < 20 || !from) return json({ error: "Enter a valid Q U O API key and business number." }, 400);
      await Promise.all([
        saveSecret(secretNames.quoKey, apiKey, "Aura Q U O API key"),
        saveSecret(secretNames.quoFrom, from, "Aura Q U O SMS sender"),
      ]);
      return json({ ok: true, sms: true });
    }
    if (input.action === "send_whatsapp") {
      const id = await sendTwilioWhatsApp(input.to, input.message, "https://build.avantiap.com/api/aura/whatsapp/twilio");
      return json({ ok: true, id });
    }
    if (input.action === "send_sms") {
      const id = await sendQuoSms(input.to, input.message);
      return json({ ok: true, id });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Messaging request failed." }, 400);
  }
});

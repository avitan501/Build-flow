import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>;
const serviceKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const OWNER_EMAIL = "avitanneto@gmail.com";
const STAFF_EMAILS = new Set(["buildavantiap@gmail.com", "info@fivetownsbuilders.com"]);

const secretNames = {
  twilioSid: "aura_twilio_account_sid",
  twilioToken: "aura_twilio_auth_token",
  twilioFrom: "aura_twilio_whatsapp_from",
  quoKey: "aura_quo_api_key",
  quoFrom: "aura_quo_from_number",
  openaiKey: "openai_supplier_quote_api_key",
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
  if (input.startsWith("+")) {
    if (digits.length === 10 && digits.startsWith("347")) return `+1${digits}`;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
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

async function requireManager(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const email = data.user.email?.trim().toLowerCase() || "";
  const { data: profile } = await admin
    .from("profiles")
    .select("role, approval_status, is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  const isOwner = email === OWNER_EMAIL && profile?.role === "admin";
  const isStaff = STAFF_EMAILS.has(email) && profile?.role === "staff";
  if ((!isOwner && !isStaff) || profile?.approval_status !== "approved" || profile.is_active !== true) return null;
  return { user: data.user, isOwner };
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

async function contactId(phone: string | null, email: string | null = null) {
  if (!phone && !email) return null;
  const rows = phone
    ? await sql<{ id: string }[]>`select id from public.aura_contacts where normalized_phone = ${phone} limit 1`
    : await sql<{ id: string }[]>`select id from public.aura_contacts where lower(email) = lower(${email}) limit 1`;
  return rows[0]?.id || null;
}

async function storeCommunication(input: {
  provider: "whatsapp" | "quo" | "manual";
  channel: "whatsapp" | "sms" | "email";
  externalId: string;
  direction: "incoming" | "outgoing";
  counterpartyPhone?: string | null;
  counterpartyEmail?: string | null;
  businessPhone?: string | null;
  subject?: string | null;
  body: string | null;
  status: string;
  media?: Array<{ url?: string; type?: string }>;
}) {
  const now = new Date().toISOString();
  const linkedContact = await contactId(input.counterpartyPhone || null, input.counterpartyEmail || null);
  await sql`
    insert into public.aura_communications (
      provider, channel, external_activity_id, contact_id, direction,
      counterparty_phone, counterparty_email, business_phone, subject, body, status, media, occurred_at, last_event_at
    ) values (
      ${input.provider}, ${input.channel}, ${input.externalId}, ${linkedContact}, ${input.direction},
      ${input.counterpartyPhone || null}, ${input.counterpartyEmail || null}, ${input.businessPhone || null},
      ${input.subject || null}, ${input.body}, ${input.status},
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
  const canonicalUrl = req.headers.get("x-avantia-canonical-url") || req.url;
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

async function sendTwilioWhatsApp(
  toValue: unknown,
  bodyValue: unknown,
  canonicalCallbackUrl: string,
  mediaUrlValue?: unknown,
) {
  const config = await twilioConfig();
  if (!config) throw new Error("WhatsApp is not connected.");
  const to = normalizePhone(toValue);
  const body = typeof bodyValue === "string" ? bodyValue.trim().slice(0, 1600) : "";
  const mediaUrl = typeof mediaUrlValue === "string" && /^https:\/\/build\.avantiap\.com\/videos\/[a-z0-9-]+\.mp4$/i.test(mediaUrlValue)
    ? mediaUrlValue
    : null;
  if (!to || !body) throw new Error("Enter a valid WhatsApp number and message.");
  const form = new URLSearchParams({
    From: `whatsapp:${config.from}`,
    To: `whatsapp:${to}`,
    Body: body,
    StatusCallback: canonicalCallbackUrl,
  });
  if (mediaUrl) form.set("MediaUrl", mediaUrl);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const result = await response.json() as { sid?: string; status?: string; message?: string };
  if (!response.ok || !result.sid) throw new Error(result.message || `Twilio returned HTTP ${response.status}.`);
  await storeCommunication({
    provider: "whatsapp",
    channel: "whatsapp",
    externalId: result.sid,
    direction: "outgoing",
    counterpartyPhone: to,
    businessPhone: config.from,
    body,
    status: result.status || "queued",
    media: mediaUrl ? [{ url: mediaUrl, type: "video/mp4" }] : [],
  });
  return result.sid;
}

async function syncRecentTwilioWhatsApp() {
  const config = await twilioConfig();
  if (!config) return 0;
  const query = new URLSearchParams({ PageSize: "50" });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json?${query.toString()}`,
    { headers: { Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}` } },
  );
  if (!response.ok) throw new Error(`Twilio history returned HTTP ${response.status}.`);
  const payload = await response.json() as {
    messages?: Array<{
      sid?: string;
      direction?: string;
      from?: string;
      to?: string;
      body?: string;
      status?: string;
    }>;
  };
  const whatsappMessages = (payload.messages || []).filter((message) =>
    message.sid && (message.from?.startsWith("whatsapp:") || message.to?.startsWith("whatsapp:")),
  );
  const incoming = whatsappMessages.filter((message) => message.direction === "inbound");
  const outgoing = whatsappMessages.filter((message) => message.direction !== "inbound");
  await Promise.all(incoming.map((message) => storeCommunication({
    provider: "whatsapp",
    channel: "whatsapp",
    externalId: message.sid as string,
    direction: "incoming",
    counterpartyPhone: normalizePhone((message.from || "").replace(/^whatsapp:/i, "")),
    businessPhone: normalizePhone((message.to || "").replace(/^whatsapp:/i, "")),
    body: message.body?.trim() || null,
    status: message.status || "received",
  })));
  await Promise.all(outgoing.map((message) => sql`
    update public.aura_communications
    set status = ${message.status || "queued"}, last_event_at = now(), updated_at = now()
    where provider = 'whatsapp' and external_activity_id = ${message.sid as string}
  `));
  return incoming.length;
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

function validEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

async function sendEmail(toValue: unknown, subjectValue: unknown, bodyValue: unknown) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Email is not connected.");
  const to = validEmail(toValue);
  const subject = typeof subjectValue === "string" ? subjectValue.trim().slice(0, 200) || "Message from Avantia Build" : "Message from Avantia Build";
  const body = typeof bodyValue === "string" ? bodyValue.trim().slice(0, 10_000) : "";
  if (!to || !body) throw new Error("Enter a valid email address and message.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Avantia Build <office@build.avantiap.com>",
      to: [to],
      reply_to: "buildavantiap@gmail.com",
      subject,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><p>${escapeHtml(body).replaceAll("\n", "<br />")}</p><p style="margin-top:24px;color:#667085">Avantia Build · (516) 908-8319</p></div>`,
    }),
  });
  const result = await response.json() as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new Error(result.message || `Email returned HTTP ${response.status}.`);
  await storeCommunication({ provider: "manual", channel: "email", externalId: result.id, direction: "outgoing", counterpartyEmail: to, subject, body, status: "sent" });
  return result.id;
}

function openAiOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    return content.flatMap((entry) => entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string" ? [(entry as { text: string }).text] : []);
  }).join("\n").trim();
}

const dashboardAiModels = {
  luna: { id: "gpt-5.6-luna", effort: "low" },
  terra: { id: "gpt-5.6-terra", effort: "low" },
  sol: { id: "gpt-5.6-sol", effort: "medium" },
} as const;

async function dashboardAi(queryValue: unknown, contextValue: unknown, modelValue: unknown, imageValue: unknown) {
  const apiKey = await secret(secretNames.openaiKey);
  if (!apiKey) throw new Error("Avantia AI is not connected.");
  const query = typeof queryValue === "string" ? queryValue.trim().slice(0, 2000) : "";
  const context = typeof contextValue === "string" ? contextValue.slice(0, 180_000) : "";
  const modelKey = typeof modelValue === "string" && modelValue in dashboardAiModels ? modelValue as keyof typeof dashboardAiModels : "terra";
  const selectedModel = dashboardAiModels[modelKey];
  const imageDataUrl = typeof imageValue === "string" && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(imageValue) && imageValue.length <= 5_600_000 ? imageValue : "";
  if (query.length < 2 || !context) throw new Error("Enter a question about the current business data.");
  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: `Authorized Avantia snapshot:\n${context}\n\nEmployee question: ${query}` },
    ...(imageDataUrl ? [{ type: "input_image", image_url: imageDataUrl, detail: "auto" }] : []),
  ];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel.id,
      store: false,
      reasoning: { effort: selectedModel.effort },
      max_output_tokens: 1000,
      instructions: "You are Avantia Build's internal assistant for Carlos and authorized staff. For questions about Avantia clients, requests, suppliers, quotes, goals, tasks, or website pages, use only the supplied authorized snapshot and never invent private facts, prices, or completion status. For general construction questions, answer from professional construction knowledge, clearly label assumptions, distinguish material guidance from labor, and recommend checking plans, manufacturer instructions, local code, or a licensed professional when safety or compliance matters. Analyze an attached image when present, but state what cannot be confirmed visually. Be direct, practical, and concise. Suggest an exact Avantia path from the snapshot when useful.",
      input: [{ role: "user", content }],
    }),
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("Avantia AI could not answer right now.");
  const answer = openAiOutputText(payload);
  if (!answer) throw new Error("Avantia AI returned no answer. Try a more specific question.");
  return answer;
}

type PriceResearchResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  imageUrl: null;
  priceText: string;
  publishedDate: string | null;
  matchConfidence: "exact" | "likely";
};

type PriceResearchCallResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  phone: string | null;
  matchConfidence: "exact" | "likely";
};

type PriceResearchSalesContact = {
  company: string;
  contactName: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  url: string;
  domain: string;
};

function directProductUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/(^|\/)(search|s)(\/|$)/i.test(url.pathname)) return null;
    if (["q", "query", "search", "searchTerm", "keyword", "tbm"].some((key) => url.searchParams.has(key))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function priceResearch(queryValue: unknown, departmentValue: unknown, zipCodeValue: unknown, excludeDomainsValue: unknown) {
  const apiKey = await secret(secretNames.openaiKey);
  if (!apiKey) throw new Error("Avantia AI is not connected.");
  const query = typeof queryValue === "string" ? queryValue.trim().slice(0, 300) : "";
  const department = typeof departmentValue === "string" ? departmentValue.trim().slice(0, 100) : "";
  const zipCode = typeof zipCodeValue === "string" ? zipCodeValue.replace(/[^0-9-]/g, "").slice(0, 10) : "11516";
  const excludeDomains = Array.isArray(excludeDomainsValue)
    ? excludeDomainsValue.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 15)
    : [];
  if (query.length < 2) throw new Error("Enter a material or product to research.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: dashboardAiModels.terra.id,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 4000,
      tools: [{
        type: "web_search_preview",
        search_context_size: "medium",
        user_location: { type: "approximate", country: "US", region: "New York" },
      }],
      tool_choice: "required",
      instructions: "You are Avantia Build's construction-product sourcing researcher. Produce three distinct groups for the requested delivery ZIP: (1) up to 3 direct purchasable product-detail pages with a visibly published price, (2) up to 3 relevant stores or suppliers that publicly list a phone number and should be called for price or local availability, and (3) up to 3 public, official sales contacts or sales departments. Match model/SKU, material, dimensions, grade, thickness, package quantity, and unit as closely as possible. Never return search pages, articles, installers, lead-generation pages, private contact details, guessed people, guessed phone numbers, invented prices, or unsupported availability. A named person may be returned only when the company's official website publicly identifies that person for sales; otherwise use Sales desk or Contractor sales. Prefer suppliers serving the delivery ZIP. If a product specification differs, mark it likely instead of exact. Return an empty group when it cannot be verified.",
      input: `Item number or description: ${query}\nDepartment: ${department || "Construction materials"}\nDelivery ZIP: ${zipCode || "11516"}\nDo not return these already checked domains: ${excludeDomains.join(", ") || "none"}.`,
      text: {
        format: {
          type: "json_schema",
          name: "construction_product_sourcing",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["buyNow", "callForPrice", "salesContacts"],
            properties: {
              buyNow: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "url", "domain", "snippet", "priceText", "matchConfidence"],
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    domain: { type: "string" },
                    snippet: { type: "string" },
                    priceText: { type: "string" },
                    matchConfidence: { type: "string", enum: ["exact", "likely"] },
                  },
                },
              },
              callForPrice: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "url", "domain", "snippet", "phone", "matchConfidence"],
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    domain: { type: "string" },
                    snippet: { type: "string" },
                    phone: { type: "string" },
                    matchConfidence: { type: "string", enum: ["exact", "likely"] },
                  },
                },
              },
              salesContacts: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["company", "contactName", "role", "phone", "email", "url", "domain"],
                  properties: {
                    company: { type: "string" },
                    contactName: { type: "string" },
                    role: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" },
                    url: { type: "string" },
                    domain: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("AI price research could not run right now.");
  let parsed: {
    buyNow?: Array<Record<string, unknown>>;
    callForPrice?: Array<Record<string, unknown>>;
    salesContacts?: Array<Record<string, unknown>>;
  };
  try {
    parsed = JSON.parse(openAiOutputText(payload)) as typeof parsed;
  } catch {
    throw new Error("AI price research returned an unreadable result.");
  }
  const buyNow = (parsed.buyNow ?? []).flatMap((result): PriceResearchResult[] => {
    const url = directProductUrl(result.url);
    const priceText = typeof result.priceText === "string" && /\$\s?\d/.test(result.priceText) ? result.priceText.trim().slice(0, 40) : "";
    if (!url || !priceText) return [];
    const domain = new URL(url).hostname.replace(/^www\./, "");
    if (excludeDomains.includes(domain.toLowerCase())) return [];
    return [{
      title: typeof result.title === "string" ? result.title.trim().slice(0, 300) : domain,
      url,
      domain,
      snippet: typeof result.snippet === "string" ? result.snippet.trim().slice(0, 1200) : "",
      imageUrl: null,
      priceText,
      publishedDate: null,
      matchConfidence: result.matchConfidence === "exact" ? "exact" : "likely",
    }];
  });
  const callForPrice = (parsed.callForPrice ?? []).flatMap((result): PriceResearchCallResult[] => {
    const url = directProductUrl(result.url);
    const phone = normalizePhone(result.phone);
    if (!url || !phone) return [];
    const domain = new URL(url).hostname.replace(/^www\./, "");
    if (excludeDomains.includes(domain.toLowerCase())) return [];
    return [{
      title: typeof result.title === "string" ? result.title.trim().slice(0, 300) : domain,
      url,
      domain,
      snippet: typeof result.snippet === "string" ? result.snippet.trim().slice(0, 1200) : "",
      phone,
      matchConfidence: result.matchConfidence === "exact" ? "exact" : "likely",
    }];
  });
  const salesContacts = (parsed.salesContacts ?? []).flatMap((result): PriceResearchSalesContact[] => {
    const url = directProductUrl(result.url);
    const phone = normalizePhone(result.phone);
    const email = validEmail(result.email);
    if (!url || (!phone && !email)) return [];
    const domain = new URL(url).hostname.replace(/^www\./, "");
    if (excludeDomains.includes(domain.toLowerCase())) return [];
    return [{
      company: typeof result.company === "string" ? result.company.trim().slice(0, 200) : domain,
      contactName: typeof result.contactName === "string" && result.contactName.trim() ? result.contactName.trim().slice(0, 160) : null,
      role: typeof result.role === "string" && result.role.trim() ? result.role.trim().slice(0, 160) : "Sales desk",
      phone,
      email,
      url,
      domain,
    }];
  });
  return { buyNow, callForPrice, salesContacts };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === "POST" && url.searchParams.get("mode") === "twilio-webhook") {
    try { return await handleTwilioWebhook(req); } catch { return twiml(500); }
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const manager = await requireManager(req);
  if (!manager) return json({ error: "Manager authorization required" }, 401);
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  try {
    if (input.action === "status") {
      return json({ ok: true, whatsapp: Boolean(await twilioConfig()), sms: Boolean(await quoConfig()), email: Boolean(Deno.env.get("RESEND_API_KEY")) });
    }
    if (input.action === "dashboard") {
      await syncRecentTwilioWhatsApp();
      const [communications, contacts, whatsapp, sms] = await Promise.all([
        sql`
          select id, contact_id, provider, channel, direction, counterparty_phone, counterparty_email,
            subject, body, summary, transcript, next_steps, media, status, duration_seconds, occurred_at
          from public.aura_communications
          order by occurred_at desc
          limit 500
        `,
        sql`
          select id, full_name, normalized_phone, email, company, notes, created_at
          from public.aura_contacts
          order by created_at desc
          limit 20
        `,
        twilioConfig(),
        quoConfig(),
      ]);
      return json({
        ok: true,
        communications,
        contacts,
        connections: {
          quo: { receive: false, send: Boolean(sms) },
          whatsapp: { receive: Boolean(whatsapp), send: Boolean(whatsapp) },
          email: { receive: false, send: Boolean(Deno.env.get("RESEND_API_KEY")) },
        },
      });
    }
    if (input.action === "website_traffic") {
      const requestedSince = typeof input.since === "string" ? new Date(input.since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const since = Number.isNaN(requestedSince.getTime()) ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : requestedSince;
      const rows = await sql`
        select views.path, views.referrer_host, views.session_hash, views.device_class,
          views.city, views.region, views.country, views.user_id, views.created_at,
          profiles.full_name as profile_full_name, profiles.email as profile_email
        from public.site_page_views as views
        left join public.profiles as profiles on profiles.id = views.user_id
        where views.created_at >= ${since.toISOString()}
        order by views.created_at desc
        limit 10000
      `;
      return json({ ok: true, rows });
    }
    if (input.action === "configure_twilio") {
      if (!manager.isOwner) return json({ error: "Only the owner can change provider credentials." }, 403);
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
      if (!manager.isOwner) return json({ error: "Only the owner can change provider credentials." }, 403);
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
      const id = await sendTwilioWhatsApp(input.to, input.message, "https://build.avantiap.com/api/aura/whatsapp/twilio", input.mediaUrl);
      return json({ ok: true, id });
    }
    if (input.action === "send_sms") {
      const id = await sendQuoSms(input.to, input.message);
      return json({ ok: true, id });
    }
    if (input.action === "send_email") {
      const id = await sendEmail(input.to, input.subject, input.message);
      return json({ ok: true, id });
    }
    if (input.action === "dashboard_ai") {
      const answer = await dashboardAi(input.query, input.context, input.model, input.imageDataUrl);
      return json({ ok: true, answer });
    }
    if (input.action === "price_research") {
      const results = await priceResearch(input.query, input.department, input.zipCode, input.excludeDomains);
      return json({ ok: true, results: results.buyNow, ...results, checkedAt: new Date().toISOString(), provider: "openai_web_search" });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("aura_broker_action_failed", {
      action: typeof input?.action === "string" ? input.action : "unknown",
      message: error instanceof Error ? error.message : "Messaging request failed.",
    });
    return json({ error: error instanceof Error ? error.message : "Messaging request failed." }, 400);
  }
});

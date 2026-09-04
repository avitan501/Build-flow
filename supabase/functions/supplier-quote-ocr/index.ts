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
const MAX_BASE64_LENGTH = 34_000_000;

const quoteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["metadata", "items", "notes"],
  properties: {
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["supplierName", "quoteNumber", "quoteDate", "expiresOn", "department", "deliveryCharge", "taxPercent", "leadTimeDays", "subtotal", "total"],
      properties: {
        supplierName: { type: "string" },
        quoteNumber: { type: "string" },
        quoteDate: { type: "string", description: "YYYY-MM-DD or empty string" },
        expiresOn: { type: "string", description: "YYYY-MM-DD or empty string" },
        department: { type: "string" },
        deliveryCharge: { type: "number", minimum: 0 },
        taxPercent: { type: "number", minimum: 0, maximum: 100 },
        leadTimeDays: { type: ["number", "null"], minimum: 0, maximum: 3650 },
        subtotal: { type: ["number", "null"], minimum: 0 },
        total: { type: ["number", "null"], minimum: 0 },
      },
    },
    items: {
      type: "array",
      maxItems: 500,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["itemCode", "description", "specification", "quantity", "unit", "unitPrice", "lineTotal"],
        properties: {
          itemCode: { type: "string" },
          description: { type: "string" },
          specification: { type: "string" },
          quantity: { type: "number", exclusiveMinimum: 0 },
          unit: { type: "string" },
          unitPrice: { type: ["number", "null"], minimum: 0 },
          lineTotal: { type: ["number", "null"], minimum: 0 },
        },
      },
    },
    notes: { type: "string" },
  },
} as const;

const prompt = `Read this supplier quote, estimate, invoice, receipt, or material price list. Use the visual layout of the attached document as the source of truth when columns are misaligned in the text layer. Use OCR when the document is scanned or photographed. Extract only actual purchasable material rows. Do not turn headings, addresses, subtotals, tax, delivery, discounts, payments, or grand totals into material items.

Preserve model numbers, SKUs, dimensions, thicknesses, colors, grades, pack sizes, and other product details. Put a concise product name in description and remaining details in specification. Never use a quantity, price, line total, tax, or other numeric-only value as the description. Use the quantity and unit shown in the same material row. Never invent unreadable values. Use an empty string or null where the schema allows it. Dates must be YYYY-MM-DD. Capture leadTimeDays only when a delivery or availability lead time is explicitly printed. Calculate taxPercent only when the printed tax amount and taxable subtotal make it dependable. Use 0 when tax or delivery is absent or unclear. Every extracted value must be reviewed by a person before use.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" },
  });
}

async function authorized(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return false;
  const email = data.user.email?.trim().toLowerCase() || "";
  const { data: profile } = await admin.from("profiles").select("role,approval_status,is_active").eq("id", data.user.id).maybeSingle();
  const roleAllowed = (email === OWNER_EMAIL && profile?.role === "admin") || (STAFF_EMAILS.has(email) && profile?.role === "staff");
  return roleAllowed && profile?.approval_status === "approved" && profile.is_active === true;
}

async function openAiKey() {
  const rows = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret from vault.decrypted_secrets where name = 'openai_supplier_quote_api_key' limit 1
  `;
  return rows[0]?.decrypted_secret || null;
}

function responseText(response: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (response.output_text?.trim()) return response.output_text.trim();
  return (response.output ?? []).flatMap((entry) => entry.content ?? []).map((entry) => entry.text ?? "").join("\n").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!await authorized(req)) return json({ error: "Manager authorization required" }, 401);

  const apiKey = await openAiKey();
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (input.action === "status") return json({ ok: true, configured: Boolean(apiKey) });
  if (input.action !== "extract" || !apiKey) return json({ error: apiKey ? "Unsupported action" : "OCR is not configured" }, 400);

  const fileName = typeof input.fileName === "string" ? input.fileName.slice(0, 255) : "supplier-quote";
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.slice(0, 120) : "application/octet-stream";
  const fileBase64 = typeof input.fileBase64 === "string" ? input.fileBase64 : "";
  const extractedText = typeof input.extractedText === "string" ? input.extractedText.slice(0, 180_000) : "";
  if (fileBase64.length > MAX_BASE64_LENGTH) return json({ error: "The document is too large for AI extraction." }, 413);

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (fileBase64 && (mimeType === "application/pdf" || mimeType.startsWith("image/"))) {
    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    content.push(mimeType.startsWith("image/")
      ? { type: "input_image", image_url: dataUrl, detail: "high" }
      : { type: "input_file", filename: fileName, file_data: dataUrl });
  }
  if (extractedText.trim()) content.push({ type: "input_text", text: `OCR/text-layer reference for ${fileName}. Use it to confirm values, but prefer the document layout when columns are interleaved.\n\n${extractedText}` });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 12_000,
      input: [{ role: "user", content }],
      text: { verbosity: "low", format: { type: "json_schema", name: "supplier_quote_extraction", strict: true, schema: quoteSchema } },
    }),
  });
  if (!response.ok) return json({ error: `OpenAI returned HTTP ${response.status}`, requestId: response.headers.get("x-request-id") }, 502);
  const text = responseText(await response.json());
  if (!text) return json({ error: "OpenAI returned an empty extraction." }, 502);
  try { return json({ ok: true, result: JSON.parse(text) }); } catch { return json({ error: "OpenAI returned invalid structured output." }, 502); }
});

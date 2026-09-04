import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  max: 1,
  prepare: false,
});
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") || "{}",
) as Record<string, string>;
const serviceKey =
  secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});
const MAX_BASE64_LENGTH = 34_000_000;

const documentTypes = [
  "supplier_quote",
  "supplier_invoice",
  "client_invoice",
  "receipt",
  "catalog_price_list",
  "client_estimate",
  "material_list",
  "purchase_order",
  "project_document",
  "unknown",
];
const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["field", "value", "page", "sourceText", "confidence", "selected"],
  properties: {
    field: { type: "string" },
    value: { type: "string" },
    page: { type: ["integer", "null"], minimum: 1 },
    sourceText: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    selected: { type: "boolean" },
  },
} as const;
const documentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "classificationConfidence",
    "metadata",
    "items",
    "evidence",
    "warnings",
    "suggestedActions",
    "notes",
  ],
  properties: {
    documentType: { type: "string", enum: documentTypes },
    classificationConfidence: { type: "number", minimum: 0, maximum: 1 },
    metadata: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "partyName",
        "documentNumber",
        "documentDate",
        "dueDate",
        "expiresOn",
        "department",
        "currency",
        "subtotal",
        "discount",
        "deliveryCharge",
        "taxAmount",
        "taxPercent",
        "total",
      ],
      properties: {
        title: { type: "string" },
        partyName: { type: "string" },
        documentNumber: { type: "string" },
        documentDate: { type: "string" },
        dueDate: { type: "string" },
        expiresOn: { type: "string" },
        department: { type: "string" },
        currency: { type: "string" },
        subtotal: { type: ["number", "null"], minimum: 0 },
        discount: { type: "number", minimum: 0 },
        deliveryCharge: { type: "number", minimum: 0 },
        taxAmount: { type: ["number", "null"], minimum: 0 },
        taxPercent: { type: ["number", "null"], minimum: 0, maximum: 100 },
        total: { type: ["number", "null"], minimum: 0 },
      },
    },
    items: {
      type: "array",
      maxItems: 500,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "itemCode",
          "description",
          "specification",
          "quantity",
          "unit",
          "unitPrice",
          "lineTotal",
          "page",
          "sourceText",
          "confidence",
        ],
        properties: {
          itemCode: { type: "string" },
          description: { type: "string" },
          specification: { type: "string" },
          quantity: { type: ["number", "null"], exclusiveMinimum: 0 },
          unit: { type: "string" },
          unitPrice: { type: ["number", "null"], minimum: 0 },
          lineTotal: { type: ["number", "null"], minimum: 0 },
          page: { type: ["integer", "null"], minimum: 1 },
          sourceText: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    evidence: { type: "array", maxItems: 200, items: evidenceSchema },
    warnings: { type: "array", maxItems: 50, items: { type: "string" } },
    suggestedActions: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
    notes: { type: "string" },
  },
} as const;

const prompt = `Classify and extract this business document for Avantia Build. supplier_invoice is a bill received from a vendor; client_invoice is an outgoing invoice Avantia sends to a customer. Never combine those directions. Read the visual layout, scans, photos, handwriting, strike-throughs, and handwritten corrections. Never invent unreadable or missing values. If handwriting changes or may change a printed value, add a warning identifying both values so a person must confirm it.

Extract the vendor/customer, document number and dates, material or service rows, subtotal, discount, delivery/freight, tax amount, tax percent, total, and the most likely Avantia material department. Dates must be YYYY-MM-DD or empty. Preserve SKU/model, dimensions, grade, color, and pack size. Delivery fees, shipping, freight, sales tax, discounts, payments, balances, subtotals, and totals belong only in metadata and must never become item rows. When flooring is priced by total square footage, use sq ft as the unit and keep cartons/units and sq. ft. per unit in the specification. For an explicit per-thousand rate such as 470/MS, 470/MSF, 225/ML, or 225/MLF, use the billable thousand-unit quantity (for example 0.64 MS or 0.10 ML) as quantity and the printed per-thousand rate as unitPrice; preserve the physical piece or box count and dimensions in specification and sourceText.

For every important field and line, return source text, page, confidence, and selected=true. Confidence means clearly supported by the document. Suggest actions, but never approve, route, post, or create a financial record.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function authorized(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return false;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: profile } = await admin
    .from("profiles")
    .select("email,role,approval_status,is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.approval_status !== "approved" || profile.is_active !== true)
    return false;
  if (
    profile.role === "admin" &&
    profile.email?.trim().toLowerCase() === "avitanneto@gmail.com"
  )
    return true;
  if (profile.role !== "staff") return false;
  const { data: grant } = await admin
    .from("staff_access_grants")
    .select("can_manage_suppliers,active")
    .eq("email", profile.email?.trim().toLowerCase() || "")
    .maybeSingle();
  return grant?.active === true && grant.can_manage_suppliers === true;
}

async function openAiKey() {
  const rows = await sql<
    { decrypted_secret: string }[]
  >`select decrypted_secret from vault.decrypted_secrets where name = 'openai_supplier_quote_api_key' limit 1`;
  return rows[0]?.decrypted_secret || null;
}

function responseText(response: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}) {
  return (
    response.output_text?.trim() ||
    (response.output ?? [])
      .flatMap((entry) => entry.content ?? [])
      .map((entry) => entry.text ?? "")
      .join("\n")
      .trim()
  );
}

type ExtractionAttempt = {
  result?: unknown;
  code?: string;
  upstreamStatus?: number;
  requestId?: string | null;
};

function safeOpenAiError(body: string) {
  try {
    const payload = JSON.parse(body) as {
      error?: { type?: string; code?: string; message?: string };
    };
    return {
      type: String(payload.error?.type || "unknown").slice(0, 80),
      code: String(payload.error?.code || "unknown").slice(0, 80),
      message: String(payload.error?.message || "")
        .replace(/\s+/g, " ")
        .slice(0, 240),
    };
  } catch {
    return {
      type: "unknown",
      code: "unknown",
      message: "Unreadable upstream error",
    };
  }
}

async function requestExtraction(
  apiKey: string,
  content: Array<Record<string, unknown>>,
  timeoutMs: number,
): Promise<ExtractionAttempt> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_DOCUMENT_MODEL") || "gpt-5-mini",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 16_000,
        input: [{ role: "user", content }],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "avantia_document_extraction",
            strict: true,
            schema: documentSchema,
          },
        },
      }),
    });
    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      const upstream = safeOpenAiError(await response.text());
      console.error("OpenAI document extraction rejected", {
        upstreamStatus: response.status,
        requestId,
        errorType: upstream.type,
        errorCode: upstream.code,
        message: upstream.message,
      });
      return {
        code: upstream.code === "unknown" ? "upstream_error" : upstream.code,
        upstreamStatus: response.status,
        requestId,
      };
    }
    const text = responseText(await response.json());
    if (!text) return { code: "empty_output", upstreamStatus: 200, requestId };
    try {
      return { result: JSON.parse(text) };
    } catch {
      console.error(
        "OpenAI document extraction returned invalid structured output",
        { requestId },
      );
      return { code: "invalid_output", upstreamStatus: 200, requestId };
    }
  } catch (error) {
    const code =
      error instanceof DOMException && error.name === "AbortError"
        ? "timeout"
        : "network_error";
    console.error("OpenAI document extraction request failed", { code });
    return { code };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await authorized(req)))
    return json({ error: "Manager authorization required" }, 401);
  const apiKey = await openAiKey();
  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (input.action === "status")
    return json({ ok: true, configured: Boolean(apiKey) });
  if (input.action !== "extract" || !apiKey)
    return json(
      {
        error: apiKey ? "Unsupported action" : "Document AI is not configured",
      },
      400,
    );
  const fileName =
    typeof input.fileName === "string"
      ? input.fileName.slice(0, 255)
      : "document";
  const mimeType =
    typeof input.mimeType === "string"
      ? input.mimeType.slice(0, 120)
      : "application/octet-stream";
  const fileBase64 =
    typeof input.fileBase64 === "string" ? input.fileBase64 : "";
  const extractedText =
    typeof input.extractedText === "string"
      ? input.extractedText.slice(0, 180_000)
      : "";
  if (fileBase64.length > MAX_BASE64_LENGTH)
    return json({ error: "The document is too large for AI extraction." }, 413);
  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: prompt },
  ];
  if (
    fileBase64 &&
    (mimeType === "application/pdf" || mimeType.startsWith("image/"))
  ) {
    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    content.push(
      mimeType.startsWith("image/")
        ? { type: "input_image", image_url: dataUrl, detail: "high" }
        : { type: "input_file", filename: fileName, file_data: dataUrl },
    );
  }
  if (extractedText.trim())
    content.push({
      type: "input_text",
      text: `Text-layer/OCR reference for ${fileName}; prefer the visual layout when columns conflict:\n\n${extractedText}`,
    });
  let extraction = await requestExtraction(apiKey, content, 28_000);
  const textRecoveryAllowed =
    ![401, 403, 429].includes(extraction.upstreamStatus ?? 0) &&
    !(
      (extraction.upstreamStatus ?? 0) >= 500 &&
      (extraction.upstreamStatus ?? 0) <= 599
    ) &&
    (extraction.upstreamStatus === 400 ||
      ["empty_output", "invalid_output", "timeout", "network_error"].includes(
        extraction.code || "",
      ));
  if (!extraction.result && extractedText.trim() && textRecoveryAllowed) {
    extraction = await requestExtraction(
      apiKey,
      [
        { type: "input_text", text: prompt },
        {
          type: "input_text",
          text: `OCR-only recovery for ${fileName}. The visual request could not be processed. Never invent missing values; mark uncertain rows for review:\n\n${extractedText}`,
        },
      ],
      20_000,
    );
  }
  if (extraction.result) return json({ ok: true, result: extraction.result });
  return json(
    {
      error:
        "Document AI is temporarily unavailable. The original is safe; re-read is safe.",
      code: extraction.code || "upstream_error",
      upstreamStatus: extraction.upstreamStatus ?? null,
      requestId: extraction.requestId ?? null,
    },
    502,
  );
});

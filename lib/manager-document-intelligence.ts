import "server-only";

import { Buffer } from "node:buffer";

import {
  managerDocumentTypes,
  type ManagerDocumentEvidence,
  type ManagerDocumentType,
} from "@/lib/manager-documents";
import {
  documentArithmeticWarnings,
  documentLineValidationStatus,
  isManagerDocumentChargeLine,
  normalizeDocumentPricingBasis,
} from "@/lib/manager-document-validation";

type RawDocumentItem = {
  itemCode: string;
  description: string;
  specification: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  lineTotal: number | null;
  page: number | null;
  sourceText: string;
  confidence: number;
};

export type ManagerDocumentExtraction = {
  documentType: ManagerDocumentType;
  classificationConfidence: number;
  title: string;
  partyName: string;
  documentNumber: string;
  documentDate: string;
  dueDate: string;
  expiresOn: string;
  department: string;
  currency: string;
  subtotal: number | null;
  discount: number;
  deliveryCharge: number;
  taxAmount: number | null;
  taxPercent: number | null;
  total: number | null;
  items: Array<
    RawDocumentItem & {
      validationStatus: "valid" | "needs_review" | "mismatch";
    }
  >;
  evidence: ManagerDocumentEvidence[];
  warnings: string[];
  suggestedActions: string[];
  notes: string;
};

export type ManagerDocumentAiInvoker = (input: {
  action: "extract";
  fileName: string;
  mimeType: string;
  fileBase64: string;
  extractedText: string;
}) => Promise<unknown>;

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
};
const DOCUMENT_TYPES = new Set<string>(managerDocumentTypes);
const MAX_DOCUMENT_MONEY = 999_999_999_999.99;
const MAX_DOCUMENT_LINE_VALUE = 100_000_000;

function clean(value: unknown, max = 500) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function numberOrNull(
  value: unknown,
  options: { max?: number; positive?: boolean } = {},
) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  const minimumAccepted = options.positive ? parsed > 0 : parsed >= 0;
  return Number.isFinite(parsed) && minimumAccepted && parsed <= (options.max ?? MAX_DOCUMENT_MONEY)
    ? Math.round(parsed * 10_000) / 10_000
    : null;
}

function confidence(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function date(value: unknown) {
  const candidate = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || candidate.startsWith("0000-"))
    return "";
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate
    ? candidate
    : "";
}

function currency(value: unknown) {
  const candidate = clean(value, 8).toUpperCase();
  return /^[A-Z]{3,8}$/.test(candidate) ? candidate : "USD";
}

function responseText(response: OpenAIResponse) {
  return (
    response.output_text?.trim() ||
    (response.output ?? [])
      .flatMap((entry) => entry.content ?? [])
      .map((entry) => entry.text ?? "")
      .join("\n")
      .trim()
  );
}

type OpenAiExtractionAttempt = {
  extraction: ManagerDocumentExtraction | null;
  status?: number;
  code?: string;
};

async function requestOpenAiDocument(
  apiKey: string,
  content: Array<Record<string, unknown>>,
  timeoutMs: number,
): Promise<OpenAiExtractionAttempt> {
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
        model:
          process.env.OPENAI_DOCUMENT_MODEL ||
          process.env.OPENAI_SUPPLIER_QUOTE_MODEL ||
          "gpt-5-mini",
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
    if (!response.ok) {
      let code = "upstream_error";
      try {
        code = String(
          ((await response.json()) as { error?: { code?: string } }).error
            ?.code || code,
        ).slice(0, 80);
      } catch {
        /* sanitized status is enough */
      }
      console.error("OpenAI document extraction unavailable", {
        status: response.status,
        code,
        requestId: response.headers.get("x-request-id"),
      });
      return { extraction: null, status: response.status, code };
    }
    const output = responseText((await response.json()) as OpenAIResponse);
    if (!output) return { extraction: null, status: 200, code: "empty_output" };
    try {
      return {
        extraction: normalizeManagerDocumentExtraction(JSON.parse(output)),
      };
    } catch (error) {
      console.error(
        "OpenAI document extraction returned invalid structured output",
        error,
      );
      return { extraction: null, status: 200, code: "invalid_output" };
    }
  } catch (error) {
    const code =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_error";
    console.error("OpenAI document extraction request failed", { code });
    return { extraction: null, code };
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeManagerDocumentExtraction(
  value: unknown,
): ManagerDocumentExtraction {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const metadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : {};
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item) => {
      const extracted: RawDocumentItem = {
        itemCode: clean(item.itemCode, 120),
        description: clean(item.description, 500),
        specification: clean(item.specification, 1000),
        quantity: numberOrNull(item.quantity, {
          max: MAX_DOCUMENT_LINE_VALUE,
          positive: true,
        }),
        unit: clean(item.unit, 40),
        unitPrice: numberOrNull(item.unitPrice, {
          max: MAX_DOCUMENT_LINE_VALUE,
        }),
        lineTotal: numberOrNull(item.lineTotal, {
          max: MAX_DOCUMENT_LINE_VALUE,
        }),
        page:
          Number.isInteger(Number(item.page)) &&
          Number(item.page) > 0 &&
          Number(item.page) <= 2_147_483_647
            ? Number(item.page)
            : null,
        sourceText: clean(item.sourceText, 1000),
        confidence: confidence(item.confidence),
      };
      const normalized = normalizeDocumentPricingBasis(extracted);
      return {
        ...normalized,
        validationStatus: documentLineValidationStatus(normalized),
      };
    })
    .filter(
      (item) =>
        item.description && !isManagerDocumentChargeLine(item.description),
    )
    .slice(0, 500);

  const subtotal = numberOrNull(metadata.subtotal);
  const discount = numberOrNull(metadata.discount) ?? 0;
  const deliveryCharge = numberOrNull(metadata.deliveryCharge) ?? 0;
  const taxAmount = numberOrNull(metadata.taxAmount);
  const taxPercent = numberOrNull(metadata.taxPercent, { max: 100 });
  const total = numberOrNull(metadata.total);
  const warnings = (Array.isArray(input.warnings) ? input.warnings : [])
    .map((warning) => clean(warning, 500))
    .filter(Boolean)
    .slice(0, 50);
  warnings.push(
    ...documentArithmeticWarnings({
      items,
      subtotal,
      discount,
      deliveryCharge,
      taxAmount,
      total,
    }),
  );

  const rawType = clean(input.documentType, 40);
  return {
    documentType: DOCUMENT_TYPES.has(rawType)
      ? (rawType as ManagerDocumentType)
      : "unknown",
    classificationConfidence: confidence(input.classificationConfidence),
    title: clean(metadata.title, 240),
    partyName: clean(metadata.partyName, 200),
    documentNumber: clean(metadata.documentNumber, 100),
    documentDate: date(metadata.documentDate),
    dueDate: date(metadata.dueDate),
    expiresOn: date(metadata.expiresOn),
    department: clean(metadata.department, 120) || "Others",
    currency: currency(metadata.currency),
    subtotal,
    discount,
    deliveryCharge,
    taxAmount,
    taxPercent: taxPercent === null ? null : Math.min(100, taxPercent),
    total,
    items,
    evidence: (Array.isArray(input.evidence) ? input.evidence : [])
      .filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
      .map((entry) => ({
        field: clean(entry.field, 100),
        value: clean(entry.value, 500),
        page:
          Number.isInteger(Number(entry.page)) && Number(entry.page) > 0
            ? Number(entry.page)
            : null,
        sourceText: clean(entry.sourceText, 1000),
        confidence: confidence(entry.confidence),
        selected: entry.selected !== false,
      }))
      .filter((entry) => entry.field && entry.value)
      .slice(0, 200),
    warnings: [...new Set(warnings)],
    suggestedActions: (Array.isArray(input.suggestedActions)
      ? input.suggestedActions
      : []
    )
      .map((action) => clean(action, 80))
      .filter(Boolean)
      .slice(0, 10),
    notes: clean(input.notes, 1000),
  };
}

const fieldEvidenceSchema = {
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
    documentType: { type: "string", enum: managerDocumentTypes },
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
    evidence: { type: "array", maxItems: 200, items: fieldEvidenceSchema },
    warnings: { type: "array", maxItems: 50, items: { type: "string" } },
    suggestedActions: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
    },
    notes: { type: "string" },
  },
} as const;

const PROMPT = `Classify and extract this business document for Avantia Build. The type must be one of the schema values. supplier_invoice means a bill received from a vendor; client_invoice means an outgoing invoice Avantia sends to a customer. Never combine those two directions. Read visual layout, scans, photos, handwriting, strike-throughs, and handwritten corrections. Never invent unreadable or missing values. Whenever handwriting changes or appears to change a printed value, always add a warning identifying the printed and handwritten values so a person must confirm it. If unclear, leave the value empty/null and add a warning.

Extract the sender/vendor/customer as partyName, document number and dates, material/service rows, subtotal, discount, delivery/freight, tax amount, tax percent, and total. Dates must be YYYY-MM-DD or empty. Preserve SKU/model, dimensions, grade, color, and pack size. Delivery fees, shipping, freight, sales tax, discounts, payments, balances, subtotals, and totals belong only in metadata and must never become item rows. When flooring is priced by total square footage, use sq ft as the unit and keep cartons/units and sq. ft. per unit in the specification. For an explicit per-thousand rate such as 470/MS, 470/MSF, 225/ML, or 225/MLF, use the billable thousand-unit quantity (for example 0.64 MS or 0.10 ML) as quantity and the printed per-thousand rate as unitPrice; preserve the physical piece or box count and dimensions in specification and sourceText.

For every important field and each line, return the printed source text, page, confidence, and selected=true. Confidence measures whether the value is clearly supported by the document, not whether it seems plausible. Suggest actions, but never approve, route, post, or create financial records. A person must review before any destination changes.`;

export async function extractManagerDocument(
  file: File,
  extractedText = "",
  invoke?: ManagerDocumentAiInvoker,
) {
  if (invoke) {
    const response = await invoke({
      action: "extract",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      extractedText: extractedText.slice(0, 180_000),
    });
    const payload =
      response && typeof response === "object" && "result" in response
        ? (response as { result: unknown }).result
        : null;
    return payload ? normalizeManagerDocumentExtraction(payload) : null;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.startsWith("sk-") || apiKey.length < 30) {
    console.error("OpenAI document server fallback unavailable", {
      code: "server_key_unconfigured",
    });
    return null;
  }
  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: PROMPT },
  ];
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
  if (isPdf || isImage) {
    const dataUrl = `data:${file.type || (isPdf ? "application/pdf" : "application/octet-stream")};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
    content.push(
      isImage
        ? { type: "input_image", image_url: dataUrl, detail: "high" }
        : { type: "input_file", filename: file.name, file_data: dataUrl },
    );
  }
  if (extractedText.trim())
    content.push({
      type: "input_text",
      text: `Text-layer/OCR reference; use the visual file when columns conflict:\n\n${extractedText.slice(0, 180_000)}`,
    });
  let attempt = await requestOpenAiDocument(apiKey, content, 28_000);
  const textRecoveryAllowed =
    ![401, 403, 429].includes(attempt.status ?? 0) &&
    !((attempt.status ?? 0) >= 500 && (attempt.status ?? 0) <= 599) &&
    (attempt.status === 400 ||
      ["empty_output", "invalid_output", "timeout", "network_error"].includes(
        attempt.code || "",
      ));
  if (!attempt.extraction && extractedText.trim() && textRecoveryAllowed) {
    attempt = await requestOpenAiDocument(
      apiKey,
      [
        { type: "input_text", text: PROMPT },
        {
          type: "input_text",
          text: `OCR-only recovery for ${file.name}. The visual request could not be processed. Never invent missing values; mark uncertain rows for review:\n\n${extractedText.slice(0, 180_000)}`,
        },
      ],
      20_000,
    );
  }
  return attempt.extraction;
}

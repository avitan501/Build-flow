import { Buffer } from "node:buffer";

export type ExtractedWindowScheduleItem = {
  mark: string | null;
  location: string | null;
  quantity: number;
  windowType: string | null;
  width: string | null;
  height: string | null;
  roughOpeningWidth: string | null;
  roughOpeningHeight: string | null;
  glass: string | null;
  operation: string | null;
  notes: string | null;
  confidence: number | null;
};

export type WindowScheduleExtractionResult = {
  items: ExtractedWindowScheduleItem[];
  notes: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const OPENAI_EXTRACTION_TIMEOUT_MS = 35_000;

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeQuantity(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Number(parsed.toFixed(2));
}

function normalizeConfidence(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, Number(parsed.toFixed(2))));
}

function extractResponseText(response: OpenAIResponse) {
  if (response.output_text?.trim()) return response.output_text.trim();
  return (response.output || [])
    .flatMap((output) => output.content || [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
}

function parseJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Extraction response did not contain JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as { items?: unknown[]; notes?: unknown };
}

function normalizeItems(items: unknown[]): ExtractedWindowScheduleItem[] {
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      mark: normalizeText(item.mark),
      location: normalizeText(item.location),
      quantity: normalizeQuantity(item.quantity),
      windowType: normalizeText(item.windowType),
      width: normalizeText(item.width),
      height: normalizeText(item.height),
      roughOpeningWidth: normalizeText(item.roughOpeningWidth),
      roughOpeningHeight: normalizeText(item.roughOpeningHeight),
      glass: normalizeText(item.glass),
      operation: normalizeText(item.operation),
      notes: normalizeText(item.notes),
      confidence: normalizeConfidence(item.confidence),
    }))
    .filter((item) => item.mark || item.location || item.width || item.height || item.windowType);
}

function isImageMimeType(mimeType: string) {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

const WINDOW_SCHEDULE_EXTRACTION_PROMPT =
  "Search every page of this construction file for the actual WINDOW SCHEDULE table. The table may be titled Window Schedule, Windows, Window & Door Schedule, Fenestration Schedule, Exterior Openings, or similar. Extract ONLY rows from that schedule/table. Do not extract framing, doors, room finish schedules, general notes, materials lists, dimensions drawn on plans, elevations, legends, or any non-window material. Return only JSON with this shape: " +
  '{"items":[{"mark":"W1","location":"Bedroom","quantity":1,"windowType":"double hung","width":"30 in","height":"50 in","roughOpeningWidth":null,"roughOpeningHeight":null,"glass":"tempered","operation":"operable","notes":"egress","confidence":0.85}],"notes":"short extraction note"}. ' +
  "Keep the row values exactly as shown where possible. If dimensions or fields are unclear, use null. Do not invent values. If no window schedule table is visible anywhere in the file, return an empty items array and explain that the window schedule table was not found.";

async function callOpenAIForWindowSchedule(content: Array<Record<string, unknown>>): Promise<WindowScheduleExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      items: [],
      notes: "AI extraction is not configured. Add OPENAI_API_KEY to enable automatic window schedule extraction.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_EXTRACTION_TIMEOUT_MS);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_WINDOW_SCHEDULE_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "user",
          content,
        },
      ],
    }),
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI extraction failed: ${response.status} ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const outputText = extractResponseText(payload);
  const parsed = parseJsonObject(outputText);
  const items = normalizeItems(parsed.items || []);

  return {
    items,
    notes: normalizeText(parsed.notes) || (items.length > 0 ? "Window schedule extracted. Review before quoting." : "No window schedule rows were found."),
  };
}

export async function extractWindowScheduleFromText(text: string, sourceName: string): Promise<WindowScheduleExtractionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      items: [],
      notes: "No readable text was extracted from the uploaded file.",
    };
  }

  return callOpenAIForWindowSchedule([
    {
      type: "input_text",
      text: `${WINDOW_SCHEDULE_EXTRACTION_PROMPT}\n\nSource file: ${sourceName}\n\nExtracted plan text:\n${trimmed.slice(0, 120_000)}`,
    },
  ]);
}

export async function extractWindowScheduleFromFile(file: File): Promise<WindowScheduleExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      items: [],
      notes: "AI extraction is not configured. Add OPENAI_API_KEY to enable automatic window schedule extraction.",
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;
  const fileContent = isImageMimeType(file.type)
    ? { type: "input_image", image_url: dataUrl }
    : { type: "input_file", filename: file.name, file_data: dataUrl };

  return callOpenAIForWindowSchedule([
    {
      type: "input_text",
      text: WINDOW_SCHEDULE_EXTRACTION_PROMPT,
    },
    fileContent,
  ]);
}

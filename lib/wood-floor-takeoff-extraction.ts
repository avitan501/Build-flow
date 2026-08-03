import { Buffer } from "node:buffer";

import { extractFallbackRoomsFromText, selectPreferredWoodFloorTextPages, type WoodFloorTextPage } from "@/lib/wood-floor-takeoff-text";

export type WoodFloorRoom = {
  id: string;
  name: string;
  level: string | null;
  areaSqft: number;
  includeInTakeoff: boolean;
  roomType: "bathroom" | "basement" | "kitchen" | "hallway" | "bedroom" | "living" | "closet" | "other";
  reason: string;
  bboxPercent: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  confidence: number | null;
};

export type WoodFloorTakeoffResult = {
  rooms: WoodFloorRoom[];
  notes: string;
  sourceNote: string | null;
};

type WoodFloorTakeoffFileInput = {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
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

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(2));
}

function normalizeRoomType(value: unknown): WoodFloorRoom["roomType"] {
  const text = normalizeText(value)?.toLowerCase() || "";
  if (/\bbath|toilet|lav|powder\b/.test(text)) return "bathroom";
  if (/\bbasement|cellar\b/.test(text)) return "basement";
  if (/\bkitchen\b/.test(text)) return "kitchen";
  if (/\bhall|corridor|foyer|entry\b/.test(text)) return "hallway";
  if (/\bbed|master|primary\b/.test(text)) return "bedroom";
  if (/\bliving|family|great|dining|den|study|office\b/.test(text)) return "living";
  if (/\bcloset|wic\b/.test(text)) return "closet";
  return "other";
}

function defaultInclude(roomType: WoodFloorRoom["roomType"]) {
  if (roomType === "basement" || roomType === "bathroom" || roomType === "kitchen") return false;
  return true;
}

function normalizeConfidence(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, Number(parsed.toFixed(2))));
}

function normalizeBbox(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const x = positiveNumber(record.x);
  const y = positiveNumber(record.y);
  const width = positiveNumber(record.width);
  const height = positiveNumber(record.height);
  if (x === null || y === null || width === null || height === null) return null;
  return {
    page: Math.max(1, Math.floor(Number(record.page || 1))),
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
    width: Math.min(100, Math.max(0, width)),
    height: Math.min(100, Math.max(0, height)),
  };
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
    throw new Error("Wood floor extraction response did not contain JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeRooms(value: unknown): WoodFloorRoom[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const name = normalizeText(item.name) || normalizeText(item.room) || `Room ${index + 1}`;
      const inferredType = normalizeRoomType(item.roomType || item.type || name);
      const explicitInclude = typeof item.includeInTakeoff === "boolean" ? item.includeInTakeoff : null;
      const includeInTakeoff = inferredType === "basement" ? false : explicitInclude ?? defaultInclude(inferredType);

      return {
        id: normalizeText(item.id) || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
        name,
        level: normalizeText(item.level),
        areaSqft: positiveNumber(item.areaSqft || item.area) || 0,
        includeInTakeoff,
        roomType: inferredType,
        reason:
          normalizeText(item.reason) ||
          (inferredType === "basement"
              ? "Basement is excluded by BuildFlow default."
              : "Selected for wood floor review."),
        bboxPercent: normalizeBbox(item.bboxPercent || item.bbox),
        confidence: normalizeConfidence(item.confidence),
      };
    })
    .filter((room) => room.areaSqft > 0);
}

function isImageMimeType(mimeType: string) {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

async function extractTextFallbackFromPdf(bytes: Buffer): Promise<WoodFloorTextPage[]> {
  try {
    await import("@napi-rs/canvas");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    const result = await parser.getText();
    await parser.destroy();
    return (result.pages || [])
      .map((page: { num: number; text: string }) => ({
        pageNumber: page.num,
        text: (page.text || "").replace(/\r/g, "").trim(),
      }))
      .filter((page) => page.text.length > 0);
  } catch (error) {
    console.error("Wood floor PDF fallback extraction failed", error);
    return [];
  }
}

async function fallbackWoodFloorTakeoff(input: WoodFloorTakeoffFileInput): Promise<WoodFloorTakeoffResult> {
  const pages = input.mimeType === "application/pdf" ? await extractTextFallbackFromPdf(input.bytes) : [];
  const preferredPages = selectPreferredWoodFloorTextPages(pages);
  const rooms = extractFallbackRoomsFromText(preferredPages).slice(0, 80);
  const sourcePages = preferredPages.map((page) => page.pageNumber).join(", ");

  return {
    rooms: rooms.filter((room) => room.areaSqft > 0),
    sourceNote:
      rooms.length > 0
        ? `Fallback used searchable PDF room area labels from preferred proposed/floor-plan page${preferredPages.length > 1 ? "s" : ""}${sourcePages ? ` ${sourcePages}` : ""}. Markers are unavailable unless exact plan positions are returned.`
        : null,
    notes:
      rooms.length > 0
        ? "Review the selected rooms before ordering. Proposed/floor/finish sheets are preferred over demolition, electrical, and other duplicate sheets. Kitchens, bathrooms, and basements are excluded by default."
        : "Could not read room square footage automatically. Enter rooms manually or upload a clearer searchable plan.",
  };
}

export async function extractWoodFloorTakeoffFromBytes(input: WoodFloorTakeoffFileInput): Promise<WoodFloorTakeoffResult> {
  if (input.mimeType === "application/pdf") {
    const fallbackResult = await fallbackWoodFloorTakeoff(input);
    if (fallbackResult.rooms.length > 0) return fallbackResult;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackWoodFloorTakeoff(input);

  const base64 = input.bytes.toString("base64");
  const dataUrl = `data:${input.mimeType};base64,${base64}`;
  const fileContent = isImageMimeType(input.mimeType)
    ? { type: "input_image", image_url: dataUrl }
    : { type: "input_file", filename: input.fileName, file_data: dataUrl };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FLOORING_TAKEOFF_MODEL || process.env.OPENAI_DRYWALL_TAKEOFF_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Read this construction floor plan, finish plan, room schedule, or blueprint for a wood flooring takeoff. Return only JSON with this shape: " +
                '{"rooms":[{"id":"bedroom-1","name":"Bedroom #1","level":"Second floor","areaSqft":215.5,"roomType":"bedroom","includeInTakeoff":true,"reason":"finish schedule shows wood floor","bboxPercent":{"page":1,"x":15,"y":20,"width":18,"height":12},"confidence":0.82}],"sourceNote":"finish schedule and floor plan","notes":"short note"}.' +
                "Extract every room area that may affect wood floor. If duplicate sheets exist, always prefer proposed floor plans, architectural floor plans, finish plans, and room/finish schedules. Do not use demolition, electrical, reflected ceiling, mechanical, plumbing, structural, roof, or existing-only sheets for wood-floor room quantities when a proposed/floor/finish source exists. Basements, bathrooms, and kitchens should be includeInTakeoff false by default. Bedrooms, closets, living rooms, dining rooms, and real hall/hallway areas should be includeInTakeoff true by default unless the plan/schedule clearly excludes them; the user can deselect any room later. For hallways, try to locate a real labeled HALL/HALLWAY area or derive it from explicit plan dimensions only when the source is clear; do not use ambiguous abbreviations and do not invent hallway square footage. If you can locate a room on the chosen proposed/floor/finish plan, provide bboxPercent as page number and x/y/width/height percentages from the top-left of that page. Do not invent areas or boxes; omit rooms with no readable area.",
            },
            fileContent,
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429 || response.status === 401 || response.status === 403) {
      console.error(`OpenAI wood floor takeoff unavailable: ${response.status} ${detail.slice(0, 300)}`);
      return fallbackWoodFloorTakeoff(input);
    }
    throw new Error(`OpenAI wood floor takeoff failed: ${response.status} ${detail.slice(0, 500)}`);
  }

  const parsed = parseJsonObject(extractResponseText((await response.json()) as OpenAIResponse));
  const rooms = normalizeRooms(parsed.rooms);
  return {
    rooms,
    sourceNote: normalizeText(parsed.sourceNote),
    notes: normalizeText(parsed.notes) || "Wood floor takeoff extracted. Review selected rooms before ordering.",
  };
}

export async function extractWoodFloorTakeoffFromFile(file: File) {
  return extractWoodFloorTakeoffFromBytes({
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
  });
}

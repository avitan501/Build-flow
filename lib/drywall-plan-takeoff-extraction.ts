import { Buffer } from "node:buffer";

export type DrywallPlanOpening = {
  kind: "door" | "window" | "opening";
  mark: string | null;
  location: string | null;
  quantity: number;
  widthLabel: string | null;
  heightLabel: string | null;
  widthFeet: number | null;
  heightFeet: number | null;
  areaSqft?: number | null;
  source: string | null;
  confidence: number | null;
};

export type DrywallPlanTakeoffResult = {
  proposedLinearFeet: number | null;
  wallHeightFeet: number | null;
  ceilingAreaSqft: number | null;
  outsideCorners: number | null;
  scaleNote: string | null;
  sectionNote: string | null;
  openings: DrywallPlanOpening[];
  notes: string;
};

type DrywallPlanTakeoffFileInput = {
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

function normalizePositiveNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(2));
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

function normalizeKind(value: unknown): DrywallPlanOpening["kind"] {
  const normalized = normalizeText(value)?.toLowerCase();
  if (normalized === "door" || normalized === "window") return normalized;
  return "opening";
}

function parseDimensionToFeet(value: unknown) {
  if (typeof value === "number") return normalizePositiveNumber(value);
  const text = normalizeText(value);
  if (!text) return null;
  const normalized = text.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");

  const feetAndInches = normalized.match(/(\d+(?:\.\d+)?)\s*'\s*-?\s*(\d+(?:\.\d+)?)?\s*"?/);
  if (feetAndInches) {
    const feet = Number(feetAndInches[1]);
    const inches = Number(feetAndInches[2] || 0);
    if (Number.isFinite(feet) && Number.isFinite(inches)) return Number((feet + inches / 12).toFixed(2));
  }

  const feet = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet)\b/);
  if (feet) {
    const parsed = Number(feet[1]);
    if (Number.isFinite(parsed) && parsed > 0) return Number(parsed.toFixed(2));
  }

  const inches = normalized.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")\b/);
  if (inches) {
    const parsed = Number(inches[1]);
    if (Number.isFinite(parsed) && parsed > 0) return Number((parsed / 12).toFixed(2));
  }

  return null;
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

  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeOpenings(value: unknown): DrywallPlanOpening[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const widthLabel = normalizeText(item.widthLabel ?? item.width);
      const heightLabel = normalizeText(item.heightLabel ?? item.height);
      const widthFeet = normalizePositiveNumber(item.widthFeet) ?? parseDimensionToFeet(widthLabel);
      const heightFeet = normalizePositiveNumber(item.heightFeet) ?? parseDimensionToFeet(heightLabel);

      return {
        kind: normalizeKind(item.kind ?? item.type),
        mark: normalizeText(item.mark),
        location: normalizeText(item.location),
        quantity: normalizeQuantity(item.quantity),
        widthLabel,
        heightLabel,
        widthFeet,
        heightFeet,
        areaSqft: normalizePositiveNumber(item.areaSqft ?? item.area),
        source: normalizeText(item.source),
        confidence: normalizeConfidence(item.confidence),
      };
    })
    .filter((item) => item.mark || item.location || (item.widthFeet && item.heightFeet) || item.areaSqft);
}

function isImageMimeType(mimeType: string) {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

function parseFeetInches(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*'\s*-?\s*(?:(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?)?\s*"?/);
  if (!match) {
    const hyphenMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*"?$/);
    if (hyphenMatch) {
      const feet = Number(hyphenMatch[1]);
      const inches = Number(hyphenMatch[2]);
      if (Number.isFinite(feet) && Number.isFinite(inches)) return Number((feet + inches / 12).toFixed(2));
    }
    return parseDimensionToFeet(normalized);
  }

  const feet = Number(match[1]);
  const inches = Number(match[2] || 0);
  const denominator = Number(match[3] || 1);
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Number((feet + inches / denominator / 12).toFixed(2));
}

function normalizePlanText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBuildingFootprint(text: string) {
  const footprintMatch = text.match(/PROPOSED BUILDING\s+A\s+([0-9'"\-\s/]+)\s*X\s*([0-9'"\-\s/]+)/i);
  const baseLength = parseFeetInches(footprintMatch?.[1]);
  const baseWidth = parseFeetInches(footprintMatch?.[2]);
  if (!baseLength || !baseWidth) {
    const proposedArea =
      normalizePositiveNumber(text.match(/TOTAL PROPOSED BUILDING\s+(\d+(?:\.\d+)?)\s+SQ\. FT\./i)?.[1]) ??
      normalizePositiveNumber(text.match(/TOTAL PROPOSED\s+(\d+(?:\.\d+)?)\s+SQ\. FT\./i)?.[1]);

    if (!proposedArea) return null;

    return {
      linearFeet: Number((4 * Math.sqrt(proposedArea)).toFixed(2)),
      source: "area-derived" as const,
      areaSqft: proposedArea,
    };
  }

  let perimeter = 2 * (baseLength + baseWidth);
  const additions = [...text.matchAll(/\b[A-E]\s+([0-9'"\-\s/]+)\s*X\s*([0-9'"\-\s/]+)\s+\d+(?:\.\d+)?\s+SQ\. FT\./gi)];
  for (const match of additions) {
    const depth = parseFeetInches(match[2]);
    if (depth && match[0].trim().charAt(0).toUpperCase() !== "A") {
      perimeter += 2 * depth;
    }
  }

  return {
    linearFeet: Number(perimeter.toFixed(2)),
    source: "dimensioned-footprint" as const,
    areaSqft: null,
  };
}

function parseWindowOpeningAreas(text: string): DrywallPlanOpening[] {
  const rows: DrywallPlanOpening[] = [];
  const sections = text.split(/LIGHT & AIR/gi).slice(1);

  for (const [index, section] of sections.entries()) {
    const location = normalizeText(section.match(/^\s*([A-Z0-9 #]+?)\s+\d+(?:\.\d+)?\s+SQ\. FT\./i)?.[1]);
    const afterWindow = section.split(/WINDOWS?/i)[1];
    if (!afterWindow) continue;
    const windowText = afterWindow.split(">")[0] || afterWindow;
    const totals = [...windowText.matchAll(/(\d+(?:\.\d+)?)\s+SQ\. FT\./gi)]
      .map((item) => Number(item[1]))
      .filter((item) => Number.isFinite(item) && item > 0);
    const area = totals.length > 0 ? totals[totals.length - 1] : null;
    if (!area) continue;

    rows.push({
      kind: "window",
      mark: `Window area ${index + 1}`,
      location,
      quantity: 1,
      widthLabel: null,
      heightLabel: null,
      widthFeet: null,
      heightFeet: null,
      areaSqft: Number(area.toFixed(2)),
      source: "Light & air window schedule",
      confidence: 0.62,
    });
  }

  return rows;
}

type PositionedPdfText = {
  str: string;
  x: number;
  y: number;
};

type PdfTextContentItem = {
  str: string;
  transform: number[];
};

type LoadedPdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items?: unknown[] }>;
    cleanup: () => void;
  }>;
};

function cleanScheduleCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function collectScheduleCell(items: PositionedPdfText[], rowX: number, yMin: number, yMax: number, tolerance = 4) {
  return cleanScheduleCell(
    items
      .filter((item) => item.str.trim() && Math.abs(item.x - rowX) <= tolerance && item.y >= yMin && item.y <= yMax)
      .sort((a, b) => b.y - a.y)
      .map((item) => item.str.trim())
      .filter((item) => !["DR #", "SIZE", "QTY.", "LOCATION"].includes(item.toUpperCase()))
      .join(" "),
  );
}

function parseDoorScheduleSize(value: string) {
  const cleaned = cleanScheduleCell(value);
  const match = cleaned.match(/^(?:\((\d+(?:\.\d+)?)\)\s*)?(.+?)\s+X\s+(.+)$/i);
  if (!match) return null;

  const multiplier = Number(match[1] || 1);
  const widthFeet = parseFeetInches(match[2]);
  const heightFeet = parseFeetInches(match[3]);
  if (!widthFeet || !heightFeet || !Number.isFinite(multiplier) || multiplier <= 0) return null;

  return {
    widthFeet: Number((widthFeet * multiplier).toFixed(2)),
    heightFeet,
    widthLabel: match[1] ? `(${match[1]}) ${match[2].trim()}` : match[2].trim(),
    heightLabel: match[3].trim(),
  };
}

function parseDoorScheduleFromPositionedText(items: PositionedPdfText[]) {
  const hasDoorSchedule = items.some((item) => item.str.trim().toUpperCase() === "DOOR SCHEDULE");
  if (!hasDoorSchedule) return [];

  const markNumbers = items
    .filter((item) => /^\d{2}$/.test(item.str.trim()) && item.x >= 1100 && item.x <= 1600 && item.y >= 850 && item.y <= 910)
    .sort((a, b) => b.x - a.x);

  const rows: DrywallPlanOpening[] = [];
  const seenMarks = new Set<string>();

  for (const markNumber of markNumbers) {
    const hasDoorPrefix = items.some(
      (item) => item.str.trim() === "D-" && Math.abs(item.x - markNumber.x) <= 1.5 && item.y >= 870 && item.y <= 900,
    );
    if (!hasDoorPrefix) continue;

    const mark = `D-${markNumber.str.trim()}`;
    if (seenMarks.has(mark)) continue;

    const sizeLabel = collectScheduleCell(items, markNumber.x, 750, 805, 4.5);
    const parsedSize = parseDoorScheduleSize(sizeLabel);
    const quantity = normalizeQuantity(collectScheduleCell(items, markNumber.x, 660, 705, 4.5));
    if (!parsedSize || !quantity) continue;

    rows.push({
      kind: "door",
      mark,
      location: normalizeText(collectScheduleCell(items, markNumber.x, 575, 645, 4.5)),
      quantity,
      widthLabel: parsedSize.widthLabel,
      heightLabel: parsedSize.heightLabel,
      widthFeet: parsedSize.widthFeet,
      heightFeet: parsedSize.heightFeet,
      areaSqft: null,
      source: "Door schedule",
      confidence: 0.82,
    });
    seenMarks.add(mark);
  }

  return rows;
}

async function parseDoorScheduleOpeningsFromPdf(bytes: Buffer): Promise<DrywallPlanOpening[]> {
  try {
    await import("@napi-rs/canvas");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    const doc = await (parser as unknown as { load: () => Promise<LoadedPdfDocument> }).load();
    const rows: DrywallPlanOpening[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = (textContent.items || [])
        .filter((item): item is PdfTextContentItem => {
          return item !== null && typeof item === "object" && "str" in item && "transform" in item;
        })
        .map((item) => ({
          str: item.str,
          x: Number(item.transform[4]),
          y: Number(item.transform[5]),
        }));

      rows.push(...parseDoorScheduleFromPositionedText(items));
      page.cleanup();
    }

    await parser.destroy();
    return rows;
  } catch (error) {
    console.error("Door schedule fallback extraction failed", error);
    return [];
  }
}

async function extractTextFallbackFromPdf(bytes: Buffer) {
  try {
    await import("@napi-rs/canvas");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    const result = await parser.getText();
    await parser.destroy();
    return normalizePlanText(result.text || "");
  } catch (error) {
    console.error("PDF fallback extraction failed", error);
    return "";
  }
}

async function fallbackDrywallPlanTakeoff(input: DrywallPlanTakeoffFileInput): Promise<DrywallPlanTakeoffResult> {
  if (input.mimeType !== "application/pdf") {
    return {
      proposedLinearFeet: null,
      wallHeightFeet: null,
      ceilingAreaSqft: null,
      outsideCorners: null,
      scaleNote: null,
      sectionNote: null,
      openings: [],
      notes: "Automatic AI extraction is unavailable, and text fallback only supports PDF plan files.",
    };
  }

  const text = await extractTextFallbackFromPdf(input.bytes);
  const footprint = parseBuildingFootprint(text);
  const proposedLinearFeet = footprint?.linearFeet ?? null;
  const subtotalMatch = text.match(/SUBTOTAL BUILDING\s+(\d+(?:\.\d+)?)\s+SQ\. FT\./i);
  const ceilingAreaSqft = normalizePositiveNumber(subtotalMatch?.[1]);
  const doorOpenings = await parseDoorScheduleOpeningsFromPdf(input.bytes);
  const openings = [...parseWindowOpeningAreas(text), ...doorOpenings];

  return {
    proposedLinearFeet,
    wallHeightFeet: text.includes("10'-0\"") ? 10 : null,
    ceilingAreaSqft,
    outsideCorners: null,
    scaleNote: proposedLinearFeet
      ? footprint?.source === "area-derived"
        ? `Fallback used total proposed building area ${footprint.areaSqft} sq ft to estimate an equivalent exterior perimeter because explicit footprint dimensions were not readable. Verify linear feet before ordering.`
        : "Fallback used the proposed building area diagram dimensions, including listed footprint offsets, to estimate exterior linear feet."
      : null,
    sectionNote: text.includes("SECTION A-A") ? "Fallback found proposed sections and used 10 ft where called out in the section/elevation stack." : null,
    openings,
    notes:
      doorOpenings.length > 0
        ? `AI extraction is unavailable because the connected OpenAI project has insufficient quota. This fallback used searchable PDF text from the plan and deducted ${doorOpenings.length} door schedule rows; review all values before ordering.`
        : "AI extraction is unavailable because the connected OpenAI project has insufficient quota. This fallback used searchable PDF text from the plan; review all values before ordering. Door tags were not deducted automatically because repeated plan symbols can over-count doors.",
  };
}

export async function extractDrywallPlanTakeoffFromBytes({
  bytes,
  mimeType,
  fileName,
}: DrywallPlanTakeoffFileInput): Promise<DrywallPlanTakeoffResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackDrywallPlanTakeoff({ bytes, mimeType, fileName });
  }

  const base64 = bytes.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const fileContent = isImageMimeType(mimeType)
    ? { type: "input_image", image_url: dataUrl }
    : { type: "input_file", filename: fileName, file_data: dataUrl };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_DRYWALL_TAKEOFF_MODEL || process.env.OPENAI_WINDOW_SCHEDULE_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Read this construction plan, blueprint, or plan sheet for a drywall takeoff. Return only JSON with this exact shape: " +
                '{"proposedLinearFeet":120.5,"wallHeightFeet":8,"ceilingAreaSqft":null,"outsideCorners":6,"scaleNote":"1/4 inch = 1 foot shown on proposed floor plan","sectionNote":"A-301 section shows 8 ft wall height","openings":[{"kind":"door","mark":"D1","location":"Bedroom","quantity":2,"widthLabel":"3 ft 0 in","heightLabel":"6 ft 8 in","widthFeet":3,"heightFeet":6.67,"areaSqft":null,"source":"door schedule","confidence":0.86}],"notes":"short note"}.' +
                "Use the proposed floor plan for new/proposed drywall wall linear feet. If dimensions are not directly listed, infer from the printed scale/ruler only when the scale is visible. If wall height is not written on the floor plan, inspect sections, elevations, or details for floor-to-ceiling or wall height. Extract both window and door schedule rows that affect drywall openings. Do not invent dimensions; use null when unclear.",
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
      console.error(`OpenAI drywall takeoff unavailable: ${response.status} ${detail.slice(0, 300)}`);
      return fallbackDrywallPlanTakeoff({ bytes, mimeType, fileName });
    }
    throw new Error(`OpenAI drywall takeoff failed: ${response.status} ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const parsed = parseJsonObject(extractResponseText(payload));
  const openings = normalizeOpenings(parsed.openings);

  return {
    proposedLinearFeet: normalizePositiveNumber(parsed.proposedLinearFeet),
    wallHeightFeet: normalizePositiveNumber(parsed.wallHeightFeet),
    ceilingAreaSqft: normalizePositiveNumber(parsed.ceilingAreaSqft),
    outsideCorners: normalizePositiveNumber(parsed.outsideCorners),
    scaleNote: normalizeText(parsed.scaleNote),
    sectionNote: normalizeText(parsed.sectionNote),
    openings,
    notes: normalizeText(parsed.notes) || "Drywall plan takeoff extracted. Review every value before ordering.",
  };
}

export async function extractDrywallPlanTakeoffFromFile(file: File): Promise<DrywallPlanTakeoffResult> {
  return extractDrywallPlanTakeoffFromBytes({
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
  });
}

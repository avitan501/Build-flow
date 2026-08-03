import type { WoodFloorRoom } from "@/lib/wood-floor-takeoff-extraction";

export type WoodFloorTextPage = {
  pageNumber: number;
  text: string;
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

function inferFallbackLevel(name: string) {
  const text = name.toLowerCase();
  if (/\b(study|living|dining|kitchen)\b/.test(text)) return "First floor";
  if (/\b(master|bedroom)\b/.test(text)) return "Second floor";
  return null;
}

function cleanFallbackRoomName(value: string) {
  return value
    .replace(/\b(?:PROPOSED|RENOVATE\s+EX\.?|RENOVATE|EX\.?|EXISTING|NEW)\b/gi, "")
    .replace(/\bLIVING\s+RM\.?\b/gi, "LIVING ROOM")
    .replace(/\bBATHRM\.?\b/gi, "Bathroom")
    .replace(/\bBTHRM\.?\b/gi, "Bathroom")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+\s*/, "")
    .replace(/\.+$/, "");
}

function fallbackRoomId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildFallbackRoom(name: string, areaSqft: number, index: number, reason: string): WoodFloorRoom | null {
  const cleanedName = cleanFallbackRoomName(name);
  const area = positiveNumber(areaSqft);
  if (!cleanedName || !area) return null;
  const roomType = normalizeRoomType(cleanedName);
  return {
    id: `${fallbackRoomId(cleanedName)}-${index}`,
    name: cleanedName,
    level: inferFallbackLevel(cleanedName),
    areaSqft: area,
    includeInTakeoff: roomType === "basement" ? false : defaultInclude(roomType),
    roomType,
    reason,
    bboxPercent: null,
    confidence: 0.55,
  };
}

function addFallbackRoom(roomsByName: Map<string, WoodFloorRoom>, rawName: string, rawArea: string | number, reason: string) {
  const room = buildFallbackRoom(rawName, Number(rawArea), roomsByName.size, reason);
  if (!room) return;
  const key = fallbackRoomId(room.name);
  if (!roomsByName.has(key) || reason.includes("light and ventilation")) {
    roomsByName.set(key, room);
  }
}

function findNearbyFloorArea(lines: string[], index: number) {
  for (let offset = -1; offset >= -8; offset -= 1) {
    const line = lines[index + offset] || "";
    const match = line.match(/\b(\d{2,4}\.\d{2})\b/);
    if (match) return match[1];
  }
  return null;
}

function countMatches(text: string, regex: RegExp) {
  return text.match(regex)?.length || 0;
}

function scoreWoodFloorTextPage(page: WoodFloorTextPage) {
  const text = page.text.toLowerCase();
  const roomHits = countMatches(text, /\b(?:study|living\s+(?:room|rm)|dining\s+room|kitchen|hallway|hall|bedroom\s*#?\s*\d+|master\s+bedroom)\b/gi);
  const areaHits = countMatches(text, /\b\d{2,5}\.\d{2}\b/g);
  let score = roomHits * 5 + Math.min(areaHits, 30);

  if (/\bproposed\b/.test(text)) score += 45;
  if (/\bfloor\s+plan\b/.test(text)) score += 35;
  if (/\bfinish(?:es)?\s+(?:plan|schedule)\b|\broom\s+finish\b/.test(text)) score += 35;
  if (/\blight\s+and\s+ventilation\b|\bfloor\s+area\b/.test(text)) score += 24;
  if (/\barchitectural\b|\ba-\d{2,3}\b/.test(text)) score += 12;

  if (/\bdemolition\b|\bdemo\b|\bexisting\s+to\s+remain\b/.test(text)) score -= 80;
  if (/\belectrical\b|\blighting\b|\bpower\b|\breflected\s+ceiling\b|\brcp\b/.test(text)) score -= 80;
  if (/\bplumbing\b|\bmechanical\b|\bhvac\b|\bsprinkler\b|\bstructural\b|\bfoundation\b|\broof\b/.test(text)) score -= 60;
  if (roomHits === 0 || areaHits === 0) score -= 50;

  return score;
}

export function selectPreferredWoodFloorTextPages(pages: WoodFloorTextPage[]) {
  const scored = pages
    .map((page) => ({ ...page, score: scoreWoodFloorTextPage(page) }))
    .filter((page) => page.text.trim().length > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const bestScore = scored[0].score;
  if (bestScore <= 0) return pages;

  return scored
    .filter((page) => page.score >= Math.max(1, bestScore - 25))
    .slice(0, 4)
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map(({ pageNumber, text }) => ({ pageNumber, text }));
}

function normalizeTextInput(input: string | WoodFloorTextPage[]) {
  if (typeof input === "string") return [{ pageNumber: 1, text: input }];
  return selectPreferredWoodFloorTextPages(input);
}

export function extractFallbackRoomsFromText(input: string | WoodFloorTextPage[]) {
  const roomsByName = new Map<string, WoodFloorRoom>();
  const pages = normalizeTextInput(input);
  const lines = pages
    .flatMap((page) =>
      page.text.split("\n").map((line) => ({
        pageNumber: page.pageNumber,
        text: line,
      })),
    )
    .map((line) => ({
      ...line,
      text: line.text.replace(/\s+/g, " ").trim(),
    }))
    .filter((line) => Boolean(line.text));
  const textLines = lines.map((line) => line.text);
  const linePages = lines.map((line) => line.pageNumber);
  const selectedPageNote =
    pages.length > 0
      ? ` Preferred proposed/floor-plan page${pages.length > 1 ? "s" : ""}: ${pages.map((page) => page.pageNumber).join(", ")}.`
      : "";
  const reasonWithPage = (reason: string, pageNumber: number) => `${reason} Page ${pageNumber}.${selectedPageNote}`;
  const roomNamePattern =
    "(?:PROPOSED\\s+|RENOVATE\\s+EX\\.?\\s+|EXISTING\\s+|NEW\\s+)?(?:STUDY|LIVING\\s+(?:ROOM|RM\\.?)|DINING\\s+ROOM|KITCHEN|HALLWAY|HALL|BEDROOM\\s*#?\\s*\\d+|MASTER\\s+BEDROOM)";
  const scheduleRowRegex = new RegExp(`\\b(${roomNamePattern})\\s+(\\d{2,5}\\.\\d{2})\\b`, "gi");
  const standaloneRoomRegex = new RegExp(`\\b(${roomNamePattern})\\b`, "i");

  for (const [lineIndex, line] of textLines.entries()) {
    for (const sameLineScheduleMatch of line.matchAll(scheduleRowRegex)) {
      addFallbackRoom(
        roomsByName,
        sameLineScheduleMatch[1],
        sameLineScheduleMatch[2],
        reasonWithPage("Fallback read the room from the light and ventilation floor-area schedule.", linePages[lineIndex] || 1),
      );
    }
  }

  for (let index = 0; index < textLines.length; index += 1) {
    const roomMatch = textLines[index].match(standaloneRoomRegex);
    if (!roomMatch) continue;
    const sameLineArea = textLines[index].match(/\b(\d{2,4}\.\d{2})\s*S\.F\.?/i)?.[1];
    const nearbyArea = sameLineArea || findNearbyFloorArea(textLines, index);
    if (!nearbyArea) continue;
    addFallbackRoom(
      roomsByName,
      roomMatch[1],
      nearbyArea,
      reasonWithPage("Fallback paired a searchable room label with a nearby floor-area value.", linePages[index] || 1),
    );
  }

  return [...roomsByName.values()];
}

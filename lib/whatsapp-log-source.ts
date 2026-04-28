import fs from "node:fs/promises";
import path from "node:path";

import { parseWhatsAppLogLine } from "./whatsapp-log-parser.ts";
import type { ParsedWhatsAppLogEvent } from "./whatsapp-log-parser.ts";

export type WhatsAppLogSourceFilters = {
  senderLast4?: string | null;
  since?: string | null;
  until?: string | null;
  maxMessages?: number;
  logDir?: string;
  logFiles?: string[];
  lookbackDays?: number;
};

export type WhatsAppLogSourceResult = {
  filesScanned: string[];
  matchedEvents: ParsedWhatsAppLogEvent[];
  totalParsedEvents: number;
};

type EventCandidate = ParsedWhatsAppLogEvent & {
  timestampMs: number;
};

const DEFAULT_LOG_DIR = "/tmp/openclaw";
const DEFAULT_LOOKBACK_DAYS = 1;
const DEFAULT_MAX_MESSAGES = 5;

function normalizeLast4(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits.length === 4 ? digits : null;
}

function normalizeTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return date.toISOString();
}

function logDateFromFilename(filePath: string) {
  const match = path.basename(filePath).match(/^openclaw-(\d{4}-\d{2}-\d{2})\.log$/);
  if (!match) return null;
  return match[1];
}

async function resolveLogFiles(filters: WhatsAppLogSourceFilters) {
  if (filters.logFiles && filters.logFiles.length > 0) {
    return [...new Set(filters.logFiles.map((file) => path.resolve(file)))];
  }

  const logDir = filters.logDir || DEFAULT_LOG_DIR;
  const entries = await fs.readdir(logDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^openclaw-\d{4}-\d{2}-\d{2}\.log$/.test(entry.name))
    .map((entry) => path.join(logDir, entry.name))
    .sort();

  const since = normalizeTimestamp(filters.since);
  const until = normalizeTimestamp(filters.until);
  if (since || until) {
    const minDay = (since ?? until ?? "").slice(0, 10);
    const maxDay = (until ?? since ?? "").slice(0, 10);
    const selected = files.filter((filePath) => {
      const day = logDateFromFilename(filePath);
      if (!day) return false;
      if (minDay && day < minDay) return false;
      if (maxDay && day > maxDay) return false;
      return true;
    });
    if (selected.length > 0) return selected;
  }

  const lookbackDays = Math.max(1, Math.floor(filters.lookbackDays ?? DEFAULT_LOOKBACK_DAYS));
  return files.slice(-lookbackDays);
}

export async function readInboundWhatsAppLogEvents(filters: WhatsAppLogSourceFilters = {}): Promise<WhatsAppLogSourceResult> {
  const senderLast4 = normalizeLast4(filters.senderLast4);
  const since = normalizeTimestamp(filters.since);
  const until = normalizeTimestamp(filters.until);
  const maxMessages = Math.max(1, Math.min(50, Math.floor(filters.maxMessages ?? DEFAULT_MAX_MESSAGES)));
  const filesScanned = await resolveLogFiles(filters);
  const candidates: EventCandidate[] = [];
  let totalParsedEvents = 0;

  for (const filePath of filesScanned) {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const event = parseWhatsAppLogLine(lines[index], filePath, index + 1);
      if (!event) continue;
      totalParsedEvents += 1;

      if (senderLast4 && !event.senderPhone.endsWith(senderLast4)) continue;
      if (since && event.rawLogTime < since) continue;
      if (until && event.rawLogTime > until) continue;

      candidates.push({
        ...event,
        timestampMs: new Date(event.rawLogTime).getTime(),
      });
    }
  }

  const matchedEvents = candidates
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, maxMessages)
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .map(({ timestampMs: _timestampMs, ...event }) => event);

  return {
    filesScanned,
    matchedEvents,
    totalParsedEvents,
  };
}

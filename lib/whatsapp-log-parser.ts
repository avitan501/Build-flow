import crypto from "node:crypto";

export type ParsedWhatsAppLogEvent = {
  sourceFile: string;
  sourceLine: number;
  importedAt: string;
  providerMessageId: string | null;
  stableMessageId: string;
  senderPhone: string;
  receiverPhone: string | null;
  messageText: string | null;
  mediaType: string | null;
  mediaPath: string | null;
  mediaUrl: string | null;
  rawLogTime: string;
  rawBody: string | null;
  threadKey: string;
  contactPhone: string;
  displayName: string | null;
};

type RawLogPayload = {
  connectionId?: unknown;
  correlationId?: unknown;
  from?: unknown;
  to?: unknown;
  body?: unknown;
  mediaType?: unknown;
  mediaPath?: unknown;
  mediaUrl?: unknown;
  pushName?: unknown;
  notifyName?: unknown;
};

type RawLogRecord = {
  "0"?: unknown;
  "1"?: RawLogPayload | null;
  "2"?: unknown;
  time?: unknown;
  _meta?: {
    date?: unknown;
  } | null;
};

const WHATSAPP_BODY_PREFIX = /^\[WhatsApp\s+[^\]]+\]\s*/i;

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D+/g, "");
  if (!digits) return null;
  return `${hasPlus ? "+" : ""}${digits}`;
}

function normalizeMessageText(value: string | null) {
  if (!value) return null;
  const stripped = value.replace(WHATSAPP_BODY_PREFIX, "").trim();
  return stripped.length > 0 ? stripped : null;
}

function normalizeTimestamp(value: unknown, fallback: string) {
  const candidate = typeof value === "string" ? value : fallback;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toISOString();
}

function stableHash(parts: Array<string | null | undefined>) {
  const hash = crypto.createHash("sha256");
  for (const part of parts) {
    hash.update(part ?? "");
    hash.update("\u241f");
  }
  return hash.digest("hex");
}

export function parseWhatsAppLogLine(line: string, sourceFile: string, sourceLine: number): ParsedWhatsAppLogEvent | null {
  if (!line.trim()) return null;

  let parsed: RawLogRecord;
  try {
    parsed = JSON.parse(line) as RawLogRecord;
  } catch {
    return null;
  }

  if (parsed["2"] !== "inbound web message") return null;

  const payload = parsed["1"];
  if (!payload) return null;

  let moduleName: string | null = null;
  if (typeof parsed["0"] === "string") {
    try {
      const moduleInfo = JSON.parse(parsed["0"]) as { module?: unknown };
      moduleName = asNonEmptyString(moduleInfo.module);
    } catch {
      moduleName = null;
    }
  }

  if (moduleName !== "web-auto-reply") return null;

  const senderPhone = normalizePhone(asNonEmptyString(payload.from));
  if (!senderPhone) return null;

  const receiverPhone = normalizePhone(asNonEmptyString(payload.to));
  const rawBody = asNonEmptyString(payload.body);
  const messageText = normalizeMessageText(rawBody);
  const mediaType = asNonEmptyString(payload.mediaType);
  const mediaPath = asNonEmptyString(payload.mediaPath);
  const mediaUrl = asNonEmptyString(payload.mediaUrl);

  if (!messageText && !mediaPath && !mediaUrl) return null;

  const rawLogTime = normalizeTimestamp(parsed.time ?? parsed._meta?.date, new Date().toISOString());
  const providerMessageId = asNonEmptyString(payload.correlationId);
  const stableMessageId = providerMessageId ?? `log:${stableHash([
    senderPhone,
    receiverPhone,
    rawLogTime,
    messageText,
    mediaType,
    mediaPath,
    mediaUrl,
    sourceFile,
    String(sourceLine),
  ])}`;

  return {
    sourceFile,
    sourceLine,
    importedAt: new Date().toISOString(),
    providerMessageId,
    stableMessageId,
    senderPhone,
    receiverPhone,
    messageText,
    mediaType,
    mediaPath,
    mediaUrl,
    rawLogTime,
    rawBody,
    threadKey: `phone:${senderPhone}`,
    contactPhone: senderPhone,
    displayName: asNonEmptyString(payload.pushName) ?? asNonEmptyString(payload.notifyName),
  };
}

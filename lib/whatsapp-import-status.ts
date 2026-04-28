import "server-only";

import fs from "node:fs";
import path from "node:path";

export type WhatsAppImportStatus = {
  lastImportTime: string | null;
  importerMode: "manual-only";
  messagesImported: number;
  duplicatesSkipped: number;
  filters: {
    senderLast4: string | null;
    since: string | null;
    until: string | null;
    maxMessages: number | null;
    lookbackDays: number | null;
  };
  sourceLogFile: string | null;
  lastRunMode: "dry-run" | "apply" | null;
  safety: {
    noOutboundSending: boolean;
    noAutoReplies: boolean;
    noCronAutoImport: boolean;
  };
};

const RELATIVE_STATUS_FILE = path.join("data", "whatsapp-import-status.json");

const DEFAULT_STATUS: WhatsAppImportStatus = {
  lastImportTime: null,
  importerMode: "manual-only",
  messagesImported: 0,
  duplicatesSkipped: 0,
  filters: {
    senderLast4: null,
    since: null,
    until: null,
    maxMessages: null,
    lookbackDays: null,
  },
  sourceLogFile: null,
  lastRunMode: null,
  safety: {
    noOutboundSending: true,
    noAutoReplies: true,
    noCronAutoImport: true,
  },
};

function statusFilePath() {
  return path.join(process.cwd(), RELATIVE_STATUS_FILE);
}

export function readWhatsAppImportStatus(): WhatsAppImportStatus {
  const filePath = statusFilePath();
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WhatsAppImportStatus>;
    return {
      ...DEFAULT_STATUS,
      ...parsed,
      filters: {
        ...DEFAULT_STATUS.filters,
        ...(parsed.filters || {}),
      },
      safety: {
        ...DEFAULT_STATUS.safety,
        ...(parsed.safety || {}),
      },
    };
  } catch {
    return DEFAULT_STATUS;
  }
}

export function writeWhatsAppImportStatus(status: WhatsAppImportStatus) {
  const filePath = statusFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

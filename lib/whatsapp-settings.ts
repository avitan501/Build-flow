import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const WHATSAPP_SETTINGS_FILE = "/root/buildflow-supply/data/whatsapp-settings.json";

export const ASSISTANT_MODES = ["off", "draft_only", "auto_ack_only"] as const;
export const TONE_OPTIONS = ["warm_personal", "professional", "formal"] as const;

export type AssistantMode = (typeof ASSISTANT_MODES)[number];
export type ToneOption = (typeof TONE_OPTIONS)[number];

export type WhatsAppSettings = {
  storage_mode: "temporary_json";
  version: 1;
  assistant_mode: AssistantMode;
  safe_ack_message: string;
  forbidden_rules: {
    no_final_price: boolean;
    no_delivery_promise: boolean;
    no_order_confirmation: boolean;
    no_payment_confirmation: boolean;
    no_discount: boolean;
    no_supplier_commitment: boolean;
  };
  languages: {
    hebrew: boolean;
    english: boolean;
    spanish: boolean;
    auto_detect: boolean;
  };
  tone: ToneOption;
  alert_rules: {
    urgent: boolean;
    angry_customer: boolean;
    payment_question: boolean;
    price_question: boolean;
    order_change: boolean;
    supplier_issue: boolean;
  };
  updated_at: string;
};

export type WhatsAppSettingsInput = Omit<WhatsAppSettings, "storage_mode" | "version" | "updated_at">;

const defaultInput: WhatsAppSettingsInput = {
  assistant_mode: "draft_only",
  safe_ack_message: "קיבלנו, נבדוק ונחזור אליך",
  forbidden_rules: {
    no_final_price: true,
    no_delivery_promise: true,
    no_order_confirmation: true,
    no_payment_confirmation: true,
    no_discount: true,
    no_supplier_commitment: true,
  },
  languages: {
    hebrew: true,
    english: true,
    spanish: true,
    auto_detect: true,
  },
  tone: "warm_personal",
  alert_rules: {
    urgent: true,
    angry_customer: true,
    payment_question: true,
    price_question: true,
    order_change: true,
    supplier_issue: true,
  },
};

function nowIso() {
  return new Date().toISOString();
}

function buildSettings(input: WhatsAppSettingsInput): WhatsAppSettings {
  return {
    storage_mode: "temporary_json",
    version: 1,
    ...input,
    updated_at: nowIso(),
  };
}

export function getDefaultWhatsAppSettings(): WhatsAppSettings {
  return buildSettings(defaultInput);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireBoolean(value: unknown, field: string) {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid boolean for ${field}.`);
  }
  return value;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new Error(`Invalid string for ${field}.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  if (trimmed.length > 500) {
    throw new Error(`${field} is too long.`);
  }
  return trimmed;
}

function requireEnum<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`Invalid value for ${field}.`);
  }
  return value as T[number];
}

export function validateWhatsAppSettings(input: unknown): WhatsAppSettingsInput {
  if (!isRecord(input)) {
    throw new Error("Settings payload must be an object.");
  }

  const forbiddenRules = input.forbidden_rules;
  const languages = input.languages;
  const alertRules = input.alert_rules;

  if (!isRecord(forbiddenRules)) {
    throw new Error("forbidden_rules must be an object.");
  }
  if (!isRecord(languages)) {
    throw new Error("languages must be an object.");
  }
  if (!isRecord(alertRules)) {
    throw new Error("alert_rules must be an object.");
  }

  return {
    assistant_mode: requireEnum(input.assistant_mode, ASSISTANT_MODES, "assistant_mode"),
    safe_ack_message: requireString(input.safe_ack_message, "safe_ack_message"),
    forbidden_rules: {
      no_final_price: requireBoolean(forbiddenRules.no_final_price, "forbidden_rules.no_final_price"),
      no_delivery_promise: requireBoolean(forbiddenRules.no_delivery_promise, "forbidden_rules.no_delivery_promise"),
      no_order_confirmation: requireBoolean(forbiddenRules.no_order_confirmation, "forbidden_rules.no_order_confirmation"),
      no_payment_confirmation: requireBoolean(forbiddenRules.no_payment_confirmation, "forbidden_rules.no_payment_confirmation"),
      no_discount: requireBoolean(forbiddenRules.no_discount, "forbidden_rules.no_discount"),
      no_supplier_commitment: requireBoolean(forbiddenRules.no_supplier_commitment, "forbidden_rules.no_supplier_commitment"),
    },
    languages: {
      hebrew: requireBoolean(languages.hebrew, "languages.hebrew"),
      english: requireBoolean(languages.english, "languages.english"),
      spanish: requireBoolean(languages.spanish, "languages.spanish"),
      auto_detect: requireBoolean(languages.auto_detect, "languages.auto_detect"),
    },
    tone: requireEnum(input.tone, TONE_OPTIONS, "tone"),
    alert_rules: {
      urgent: requireBoolean(alertRules.urgent, "alert_rules.urgent"),
      angry_customer: requireBoolean(alertRules.angry_customer, "alert_rules.angry_customer"),
      payment_question: requireBoolean(alertRules.payment_question, "alert_rules.payment_question"),
      price_question: requireBoolean(alertRules.price_question, "alert_rules.price_question"),
      order_change: requireBoolean(alertRules.order_change, "alert_rules.order_change"),
      supplier_issue: requireBoolean(alertRules.supplier_issue, "alert_rules.supplier_issue"),
    },
  };
}

async function ensureDataDir() {
  await mkdir(path.dirname(WHATSAPP_SETTINGS_FILE), { recursive: true });
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readWhatsAppSettings(): Promise<WhatsAppSettings> {
  await ensureDataDir();

  if (!(await fileExists(WHATSAPP_SETTINGS_FILE))) {
    const defaults = getDefaultWhatsAppSettings();
    await writeFile(WHATSAPP_SETTINGS_FILE, `${JSON.stringify(defaults, null, 2)}\n`, "utf8");
    return defaults;
  }

  const raw = await readFile(WHATSAPP_SETTINGS_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const validated = validateWhatsAppSettings(parsed);
  return {
    storage_mode: "temporary_json",
    version: 1,
    ...validated,
    updated_at:
      isRecord(parsed) && typeof parsed.updated_at === "string" && parsed.updated_at.trim()
        ? parsed.updated_at
        : nowIso(),
  };
}

async function backupExistingSettingsFile() {
  if (!(await fileExists(WHATSAPP_SETTINGS_FILE))) {
    return null;
  }

  const stamp = nowIso().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const backupPath = `${WHATSAPP_SETTINGS_FILE}.bak.${stamp}`;
  await rename(WHATSAPP_SETTINGS_FILE, backupPath);
  return backupPath;
}

export async function saveWhatsAppSettings(input: unknown) {
  const validated = validateWhatsAppSettings(input);
  await ensureDataDir();
  const backupPath = await backupExistingSettingsFile();
  const settings = buildSettings(validated);
  await writeFile(WHATSAPP_SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return { settings, backupPath };
}

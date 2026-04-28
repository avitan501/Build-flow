import fs from "node:fs";
import path from "node:path";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { readWhatsAppImportStatus, writeWhatsAppImportStatus } from "./whatsapp-import-status.ts";
import { readInboundWhatsAppLogEvents } from "./whatsapp-log-source.ts";
import type { ParsedWhatsAppLogEvent } from "./whatsapp-log-parser.ts";
import type { WhatsAppLogSourceFilters } from "./whatsapp-log-source.ts";

export type ImportMode = "dry-run" | "apply";

export type ImportOptions = WhatsAppLogSourceFilters & {
  mode?: ImportMode;
};

type ContactRow = {
  id: string;
  phone_e164: string;
  display_name: string | null;
};

type ThreadRow = {
  id: string;
  contact_id: string;
  thread_key: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_inbound_message_id: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  external_message_id: string | null;
  created_at: string;
};

export type ImportSummary = {
  mode: ImportMode;
  filesScanned: string[];
  sourceEventsParsed: number;
  sourceEventsMatched: number;
  filters: {
    senderLast4: string | null;
    since: string | null;
    until: string | null;
    maxMessages: number;
    lookbackDays: number;
  };
  dryRun: {
    contactsToCreate: string[];
    threadsToCreate: string[];
    messagesToInsert: Array<{
      externalMessageId: string;
      senderPhone: string;
      rawLogTime: string;
      preview: string;
    }>;
    duplicateMessageIds: string[];
  };
  applied: {
    contactsCreated: number;
    threadsCreated: number;
    messagesInserted: number;
  };
};

function loadEnvFileIfNeeded() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key || process.env[key]) continue;
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    process.env[key] = rawValue.replace(/^['\"]|['\"]$/g, "");
  }
}

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function createAdminClient() {
  loadEnvFileIfNeeded();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeSenderLast4(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits.length === 4 ? digits : null;
}

function previewText(event: ParsedWhatsAppLogEvent) {
  if (event.messageText) return event.messageText.slice(0, 120);
  if (event.mediaPath || event.mediaUrl) return `Media attachment${event.mediaType ? ` · ${event.mediaType}` : ""}`;
  return "Empty message";
}

async function fetchExistingContacts(supabase: SupabaseClient, phones: string[]) {
  if (phones.length === 0) return new Map<string, ContactRow>();
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .select("id, phone_e164, display_name")
    .in("phone_e164", phones);

  if (error) throw new Error(`Failed to load existing contacts: ${error.message}`);
  return new Map(((data || []) as ContactRow[]).map((row) => [row.phone_e164, row]));
}

async function fetchExistingThreads(supabase: SupabaseClient, threadKeys: string[]) {
  if (threadKeys.length === 0) return new Map<string, ThreadRow>();
  const { data, error } = await supabase
    .from("whatsapp_threads")
    .select("id, contact_id, thread_key, status, unread_count, last_message_at, last_inbound_message_id")
    .in("thread_key", threadKeys);

  if (error) throw new Error(`Failed to load existing threads: ${error.message}`);
  return new Map(((data || []) as ThreadRow[]).map((row) => [row.thread_key, row]));
}

async function fetchExistingMessages(supabase: SupabaseClient, externalMessageIds: string[]) {
  if (externalMessageIds.length === 0) return new Map<string, MessageRow>();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("id, thread_id, external_message_id, created_at")
    .in("external_message_id", externalMessageIds);

  if (error) throw new Error(`Failed to load existing messages: ${error.message}`);
  return new Map(
    ((data || []) as MessageRow[])
      .filter((row) => typeof row.external_message_id === "string" && row.external_message_id.length > 0)
      .map((row) => [row.external_message_id as string, row]),
  );
}

function persistImportStatus(summary: ImportSummary) {
  const current = readWhatsAppImportStatus();
  const isApply = summary.mode === "apply";
  writeWhatsAppImportStatus({
    lastImportTime: isApply ? new Date().toISOString() : current.lastImportTime,
    importerMode: "manual-only",
    messagesImported: isApply ? summary.applied.messagesInserted : current.messagesImported,
    duplicatesSkipped: isApply ? summary.dryRun.duplicateMessageIds.length : current.duplicatesSkipped,
    filters: isApply
      ? {
          senderLast4: summary.filters.senderLast4,
          since: summary.filters.since,
          until: summary.filters.until,
          maxMessages: summary.filters.maxMessages,
          lookbackDays: summary.filters.lookbackDays,
        }
      : current.filters,
    sourceLogFile: isApply ? (summary.filesScanned[0] ?? current.sourceLogFile) : current.sourceLogFile,
    lastRunMode: summary.mode,
    safety: {
      noOutboundSending: true,
      noAutoReplies: true,
      noCronAutoImport: true,
    },
  });
}

export async function importWhatsAppLogs(options: ImportOptions = {}): Promise<ImportSummary> {
  const mode: ImportMode = options.mode === "apply" ? "apply" : "dry-run";
  const maxMessages = Math.max(1, Math.min(50, Math.floor(options.maxMessages ?? 5)));
  const lookbackDays = Math.max(1, Math.min(7, Math.floor(options.lookbackDays ?? 1)));
  const senderLast4 = normalizeSenderLast4(options.senderLast4);
  const since = options.since ?? null;
  const until = options.until ?? null;

  const source = await readInboundWhatsAppLogEvents({
    ...options,
    senderLast4,
    since,
    until,
    maxMessages,
    lookbackDays,
  });

  const events = source.matchedEvents;
  const uniqueEvents = new Map<string, ParsedWhatsAppLogEvent>();
  for (const event of events) {
    if (!uniqueEvents.has(event.stableMessageId)) {
      uniqueEvents.set(event.stableMessageId, event);
    }
  }

  const dedupedEvents = [...uniqueEvents.values()];
  const supabase = createAdminClient();
  const contactPhones = [...new Set(dedupedEvents.map((event) => event.contactPhone))];
  const threadKeys = [...new Set(dedupedEvents.map((event) => event.threadKey))];
  const externalMessageIds = [...new Set(dedupedEvents.map((event) => event.stableMessageId))];

  const [contactsByPhone, threadsByKey, existingMessagesById] = await Promise.all([
    fetchExistingContacts(supabase, contactPhones),
    fetchExistingThreads(supabase, threadKeys),
    fetchExistingMessages(supabase, externalMessageIds),
  ]);

  const messagesToInsert = dedupedEvents.filter((event) => !existingMessagesById.has(event.stableMessageId));
  const contactsToCreate = contactPhones.filter((phone) => !contactsByPhone.has(phone));
  const threadsToCreate = threadKeys.filter((threadKey) => !threadsByKey.has(threadKey));

  const summary: ImportSummary = {
    mode,
    filesScanned: source.filesScanned,
    sourceEventsParsed: source.totalParsedEvents,
    sourceEventsMatched: source.matchedEvents.length,
    filters: {
      senderLast4,
      since,
      until,
      maxMessages,
      lookbackDays,
    },
    dryRun: {
      contactsToCreate,
      threadsToCreate,
      messagesToInsert: messagesToInsert.map((event) => ({
        externalMessageId: event.stableMessageId,
        senderPhone: event.senderPhone,
        rawLogTime: event.rawLogTime,
        preview: previewText(event),
      })),
      duplicateMessageIds: dedupedEvents
        .filter((event) => existingMessagesById.has(event.stableMessageId))
        .map((event) => event.stableMessageId),
    },
    applied: {
      contactsCreated: 0,
      threadsCreated: 0,
      messagesInserted: 0,
    },
  };

  if (mode !== "apply" || messagesToInsert.length === 0) {
    persistImportStatus(summary);
    return summary;
  }

  const writableContactsByPhone = new Map(contactsByPhone);
  const writableThreadsByKey = new Map(threadsByKey);

  for (const phone of contactsToCreate) {
    const seedEvent = messagesToInsert.find((event) => event.contactPhone === phone);
    const { data, error } = await supabase
      .from("whatsapp_contacts")
      .insert({
        phone_e164: phone,
        display_name: seedEvent?.displayName ?? null,
        contact_type: "unknown",
        permission_mode: "draft_only",
        save_files: true,
        create_lead: false,
        create_project_draft: false,
        notes: "Imported from inbound WhatsApp logs (V1).",
      })
      .select("id, phone_e164, display_name")
      .single();

    if (error) throw new Error(`Failed to insert contact ${phone}: ${error.message}`);
    writableContactsByPhone.set(phone, data as ContactRow);
    summary.applied.contactsCreated += 1;
  }

  for (const threadKey of threadsToCreate) {
    const seedEvent = messagesToInsert.find((event) => event.threadKey === threadKey);
    if (!seedEvent) continue;
    const contact = writableContactsByPhone.get(seedEvent.contactPhone);
    if (!contact) throw new Error(`Missing contact for thread ${threadKey}`);

    const { data, error } = await supabase
      .from("whatsapp_threads")
      .insert({
        contact_id: contact.id,
        thread_key: threadKey,
        status: "awaiting_review",
        unread_count: 0,
        last_message_at: null,
      })
      .select("id, contact_id, thread_key, status, unread_count, last_message_at, last_inbound_message_id")
      .single();

    if (error) throw new Error(`Failed to insert thread ${threadKey}: ${error.message}`);
    writableThreadsByKey.set(threadKey, data as ThreadRow);
    summary.applied.threadsCreated += 1;
  }

  const insertedByThread = new Map<string, { latestMessageId: string; latestRawLogTime: string; count: number }>();

  for (const event of messagesToInsert) {
    const thread = writableThreadsByKey.get(event.threadKey);
    if (!thread) throw new Error(`Missing thread for event ${event.stableMessageId}`);

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .insert({
        thread_id: thread.id,
        external_message_id: event.stableMessageId,
        direction: "inbound",
        message_text: event.messageText,
        media_type: event.mediaType,
        media_path: event.mediaPath,
        media_url: event.mediaUrl,
        sender_phone: event.senderPhone,
        receiver_phone: event.receiverPhone,
        raw_log_time: event.rawLogTime,
        needs_review: true,
        created_at: event.rawLogTime,
      })
      .select("id, thread_id, external_message_id, created_at")
      .single();

    if (error) throw new Error(`Failed to insert message ${event.stableMessageId}: ${error.message}`);

    const inserted = data as MessageRow;
    const previous = insertedByThread.get(thread.id);
    if (!previous || previous.latestRawLogTime <= event.rawLogTime) {
      insertedByThread.set(thread.id, {
        latestMessageId: inserted.id,
        latestRawLogTime: event.rawLogTime,
        count: (previous?.count ?? 0) + 1,
      });
    } else {
      insertedByThread.set(thread.id, {
        ...previous,
        count: previous.count + 1,
      });
    }

    summary.applied.messagesInserted += 1;
  }

  for (const [threadId, stats] of insertedByThread.entries()) {
    const currentThread = [...writableThreadsByKey.values()].find((thread) => thread.id === threadId);
    if (!currentThread) continue;

    const currentLast = currentThread.last_message_at && currentThread.last_message_at > stats.latestRawLogTime
      ? currentThread.last_message_at
      : stats.latestRawLogTime;

    const { error } = await supabase
      .from("whatsapp_threads")
      .update({
        unread_count: Number(currentThread.unread_count || 0) + stats.count,
        last_message_at: currentLast,
        last_inbound_message_id: stats.latestMessageId,
        status: currentThread.status === "closed" ? currentThread.status : "awaiting_review",
      })
      .eq("id", threadId);

    if (error) throw new Error(`Failed to update thread ${threadId}: ${error.message}`);
  }

  persistImportStatus(summary);
  return summary;
}

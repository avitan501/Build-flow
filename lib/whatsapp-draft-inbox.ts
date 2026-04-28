export type ContactType = "client" | "supplier" | "worker" | "unknown";
export type PermissionMode = "draft_only" | "auto_ack_only" | "block_bot" | "ask_follow_up";
export type ThreadStatus = "open" | "awaiting_draft" | "awaiting_review" | "rejected" | "blocked" | "closed";

import { createClient } from "@/lib/supabase/server";

type ContactRow = {
  id: string;
  phone_e164: string;
  display_name: string | null;
  contact_type: ContactType;
  permission_mode: PermissionMode;
  save_files: boolean;
  create_lead: boolean;
  create_project_draft: boolean;
  linked_client_id: string | null;
  linked_project_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ThreadRow = {
  id: string;
  contact_id: string;
  thread_key: string;
  status: ThreadStatus;
  linked_client_id: string | null;
  linked_project_id: string | null;
  last_inbound_message_id: string | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  external_message_id: string | null;
  direction: "inbound" | "draft" | "system";
  message_text: string | null;
  media_type: string | null;
  media_path: string | null;
  media_url: string | null;
  sender_phone: string | null;
  receiver_phone: string | null;
  raw_log_time: string | null;
  needs_review: boolean;
  created_at: string;
};

type DraftRow = {
  id: string;
  thread_id: string;
  based_on_message_id: string | null;
  draft_text: string;
  draft_source: "manual" | "ai";
  status: "draft" | "rejected" | "archived";
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  thread_id: string | null;
  contact_id: string | null;
  message_id: string | null;
  draft_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before_json: unknown;
  after_json: unknown;
  created_at: string;
};

export type InboxThread = {
  id: string;
  threadKey: string;
  contactName: string;
  phone: string;
  contactType: ContactType;
  linkedProject: string | null;
  linkedClient: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  hasMedia: boolean;
  status: ThreadStatus;
  permissionMode: PermissionMode;
  permissionFlags: {
    saveFiles: boolean;
    createLead: boolean;
    createProjectDraft: boolean;
  };
};

export type ThreadDetail = {
  thread: InboxThread;
  contactNotes: string | null;
  messages: MessageRow[];
  drafts: DraftRow[];
  auditLog: AuditRow[];
};

export const whatsappPermissionOptions = [
  { value: "draft_only", label: "Draft only" },
  { value: "auto_ack_only", label: "Auto acknowledge only" },
  { value: "block_bot", label: "Block bot" },
  { value: "ask_follow_up", label: "Ask follow-up questions" },
] as const;

export const whatsappSafetyRules = [
  "No outbound WhatsApp sending in V1",
  "Approve Send stays disabled / Coming Soon",
  "No auto-replies from this admin UI",
  "No pricing, delivery, payment, or order commitments from draft preview",
  "Read-only DB view only until importer/actions are approved",
];

export function formatWhatsAppDateTime(value: string | null) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function textPreview(message: Pick<MessageRow, "message_text" | "media_type" | "media_path" | "media_url"> | null | undefined) {
  if (!message) return "No messages yet.";
  const text = message.message_text?.trim();
  if (text) return text;
  if (message.media_path || message.media_url) {
    return `Media attachment${message.media_type ? ` · ${message.media_type}` : ""}`;
  }
  return "Empty message";
}

function mapThread(thread: ThreadRow, contact: ContactRow | undefined, latestMessage: MessageRow | undefined): InboxThread {
  return {
    id: thread.id,
    threadKey: thread.thread_key,
    contactName: contact?.display_name?.trim() || contact?.phone_e164 || "Unknown contact",
    phone: contact?.phone_e164 || "Unknown phone",
    contactType: contact?.contact_type || "unknown",
    linkedProject: thread.linked_project_id,
    linkedClient: thread.linked_client_id,
    lastMessage: textPreview(latestMessage),
    lastMessageAt: thread.last_message_at || latestMessage?.created_at || null,
    unreadCount: Number(thread.unread_count || 0),
    hasMedia: Boolean(latestMessage?.media_path || latestMessage?.media_url || latestMessage?.media_type),
    status: thread.status,
    permissionMode: contact?.permission_mode || "draft_only",
    permissionFlags: {
      saveFiles: Boolean(contact?.save_files),
      createLead: Boolean(contact?.create_lead),
      createProjectDraft: Boolean(contact?.create_project_draft),
    },
  };
}

export async function listInboxThreads() {
  const supabase = await createClient();
  const { data: threads, error: threadError } = await supabase
    .from("whatsapp_threads")
    .select("id, contact_id, thread_key, status, linked_client_id, linked_project_id, last_inbound_message_id, unread_count, last_message_at, created_at, updated_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (threadError) {
    throw new Error(`Failed to load WhatsApp threads: ${threadError.message}`);
  }

  const threadRows = (threads || []) as ThreadRow[];
  if (threadRows.length === 0) return [] as InboxThread[];

  const contactIds = [...new Set(threadRows.map((thread) => thread.contact_id).filter(Boolean))];
  const threadIds = threadRows.map((thread) => thread.id);

  const [{ data: contacts, error: contactError }, { data: messages, error: messageError }] = await Promise.all([
    supabase
      .from("whatsapp_contacts")
      .select("id, phone_e164, display_name, contact_type, permission_mode, save_files, create_lead, create_project_draft, linked_client_id, linked_project_id, notes, created_at, updated_at")
      .in("id", contactIds),
    supabase
      .from("whatsapp_messages")
      .select("id, thread_id, external_message_id, direction, message_text, media_type, media_path, media_url, sender_phone, receiver_phone, raw_log_time, needs_review, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
  ]);

  if (contactError) {
    throw new Error(`Failed to load WhatsApp contacts: ${contactError.message}`);
  }

  if (messageError) {
    throw new Error(`Failed to load WhatsApp messages: ${messageError.message}`);
  }

  const contactsById = new Map(((contacts || []) as ContactRow[]).map((contact) => [contact.id, contact]));
  const latestMessagesByThread = new Map<string, MessageRow>();
  for (const message of (messages || []) as MessageRow[]) {
    if (!latestMessagesByThread.has(message.thread_id)) {
      latestMessagesByThread.set(message.thread_id, message);
    }
  }

  return threadRows.map((thread) => mapThread(thread, contactsById.get(thread.contact_id), latestMessagesByThread.get(thread.id)));
}

export async function getInboxThread(threadId: string) {
  const supabase = await createClient();
  const { data: thread, error: threadError } = await supabase
    .from("whatsapp_threads")
    .select("id, contact_id, thread_key, status, linked_client_id, linked_project_id, last_inbound_message_id, unread_count, last_message_at, created_at, updated_at")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    throw new Error(`Failed to load WhatsApp thread: ${threadError.message}`);
  }

  if (!thread) return null;

  const threadRow = thread as ThreadRow;
  const [{ data: contact, error: contactError }, { data: messages, error: messageError }, { data: drafts, error: draftError }, { data: auditLog, error: auditError }] = await Promise.all([
    supabase
      .from("whatsapp_contacts")
      .select("id, phone_e164, display_name, contact_type, permission_mode, save_files, create_lead, create_project_draft, linked_client_id, linked_project_id, notes, created_at, updated_at")
      .eq("id", threadRow.contact_id)
      .maybeSingle(),
    supabase
      .from("whatsapp_messages")
      .select("id, thread_id, external_message_id, direction, message_text, media_type, media_path, media_url, sender_phone, receiver_phone, raw_log_time, needs_review, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
    supabase
      .from("whatsapp_drafts")
      .select("id, thread_id, based_on_message_id, draft_text, draft_source, status, rejection_reason, created_by, created_at, updated_at")
      .eq("thread_id", threadId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("whatsapp_audit_log")
      .select("id, thread_id, contact_id, message_id, draft_id, actor_user_id, action, target_type, target_id, before_json, after_json, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false }),
  ]);

  if (contactError) throw new Error(`Failed to load WhatsApp contact: ${contactError.message}`);
  if (messageError) throw new Error(`Failed to load WhatsApp messages: ${messageError.message}`);
  if (draftError) throw new Error(`Failed to load WhatsApp drafts: ${draftError.message}`);
  if (auditError) throw new Error(`Failed to load WhatsApp audit log: ${auditError.message}`);

  const messageRows = (messages || []) as MessageRow[];
  const latestMessage = [...messageRows].reverse().find(Boolean);

  return {
    thread: mapThread(threadRow, (contact as ContactRow | null) ?? undefined, latestMessage),
    contactNotes: (contact as ContactRow | null)?.notes ?? null,
    messages: messageRows,
    drafts: (drafts || []) as DraftRow[],
    auditLog: (auditLog || []) as AuditRow[],
  } as ThreadDetail;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { canSendAuraEmail, canSendAuraQuoText } from "@/lib/aura/communications";
import { canUseTwilioWhatsApp } from "@/lib/aura/twilio-whatsapp";
import { canSendAuraWhatsApp } from "@/lib/aura/whatsapp";
import type { AuraCustomerIdentity } from "@/lib/aura/identity";
import type { AuraCommunicationLink } from "@/lib/aura/email-links";

export type AuraIntakeRow = {
  id: string;
  sender_phone: string;
  message_text: string | null;
  proposal: {
    summary?: string;
    missingInformation?: string[];
  };
  status: string;
  confirmation_code: string;
  created_at: string;
};

export type AuraContactRow = {
  id: string;
  full_name: string | null;
  normalized_phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  sms_ai_mode?: "off" | "draft" | "auto_safe";
  sms_ai_style?: "professional" | "friendly" | "brief";
  auto_create_request_drafts?: boolean;
  created_at: string;
};

export type AuraLeadRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
};

export type AuraTaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  created_at: string;
};

export type AuraCommunicationRow = {
  id: string;
  contact_id: string | null;
  provider: "quo" | "whatsapp" | "gmail" | "manual";
  channel: "call" | "sms" | "whatsapp" | "email" | "note";
  direction: "incoming" | "outgoing" | "internal" | null;
  counterparty_phone: string | null;
  counterparty_email: string | null;
  subject: string | null;
  body: string | null;
  summary: string | null;
  transcript: string | null;
  next_steps: string[];
  media: Array<{ url?: string; type?: string; name?: string; size?: number; storagePath?: string; providerAttachmentId?: string; duration?: number; processingStatus?: "processing" | "ready" | "failed" }>;
  status: string | null;
  duration_seconds: number | null;
  occurred_at: string;
  last_event_at?: string;
  mailbox_address?: string | null;
  message_id?: string | null;
  in_reply_to?: string | null;
  read_at?: string | null;
  links?: AuraCommunicationLink[];
};

function jsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function normalizeAuraCommunications(rows: unknown[] | null | undefined): AuraCommunicationRow[] {
  return (rows || []).map((value) => {
    const row = value as AuraCommunicationRow;
    return {
      ...row,
      next_steps: jsonArray<string>(row.next_steps),
      media: jsonArray<{ url?: string; type?: string; name?: string; size?: number; storagePath?: string; providerAttachmentId?: string; duration?: number }>(row.media),
      links: jsonArray<AuraCommunicationLink>(row.links),
    };
  });
}

type AuraBrokerConnectionStatus = {
  receive?: boolean;
  send?: boolean;
  recording?: boolean;
  phone?: string | null;
  provider?: string | null;
};

type AuraBrokerStatus = {
  ok?: boolean;
  connections?: {
    voice?: AuraBrokerConnectionStatus;
    quo?: AuraBrokerConnectionStatus;
    whatsapp?: AuraBrokerConnectionStatus;
    email?: AuraBrokerConnectionStatus;
  };
  // Keep compatibility with broker deployments that returned flat readiness flags.
  whatsapp?: boolean;
  whatsappProvider?: string | null;
  sms?: boolean;
  smsReceive?: boolean;
  voice?: boolean;
  voiceRecording?: boolean;
  voicePhone?: string | null;
  email?: boolean;
  emailReceive?: boolean;
  whatsappHealth?: {
    status?: string;
    checked_at?: string;
    last_success_at?: string | null;
    last_inbound_at?: string | null;
    last_error?: string | null;
    details?: {
      callbackActive?: boolean;
      businessAccountSubscribed?: boolean;
      phoneReady?: boolean;
      phoneQuality?: string | null;
      failedEvents?: number;
      pendingNotifications?: number;
      repaired?: boolean;
    } | null;
  } | null;
};

function normalizeWhatsAppHealth(status: AuraBrokerStatus | null) {
  const health = status?.whatsappHealth;
  return health ? {
    status: health.status === "healthy" ? "healthy" as const
      : health.status === "degraded" ? "degraded" as const
      : health.status === "down" ? "down" as const
      : "unknown" as const,
    checkedAt: health.checked_at || null,
    lastSuccessAt: health.last_success_at || null,
    lastInboundAt: health.last_inbound_at || null,
    error: health.last_error || null,
    callbackActive: Boolean(health.details?.callbackActive),
    businessAccountSubscribed: Boolean(health.details?.businessAccountSubscribed),
    phoneReady: Boolean(health.details?.phoneReady),
    phoneQuality: health.details?.phoneQuality || null,
    failedEvents: Number(health.details?.failedEvents || 0),
    pendingNotifications: Number(health.details?.pendingNotifications || 0),
  } : null;
}

function normalizeBrokerConnections(status: AuraBrokerStatus | null) {
  const connections = status?.connections;
  return {
    voice: {
      receive: Boolean(connections?.voice?.receive ?? status?.voice),
      send: Boolean(connections?.voice?.send ?? status?.voice),
      recording: Boolean(connections?.voice?.recording ?? status?.voiceRecording),
      phone: connections?.voice?.phone ?? status?.voicePhone ?? null,
    },
    quo: {
      receive: Boolean(connections?.quo?.receive ?? status?.smsReceive),
      send: Boolean(connections?.quo?.send ?? status?.sms),
    },
    whatsapp: {
      receive: Boolean(connections?.whatsapp?.receive ?? status?.whatsapp),
      send: Boolean(connections?.whatsapp?.send ?? status?.whatsapp),
      provider: connections?.whatsapp?.provider ?? status?.whatsappProvider ?? null,
    },
    email: {
      receive: Boolean(connections?.email?.receive ?? status?.emailReceive),
      send: Boolean(connections?.email?.send ?? status?.email),
    },
  };
}

export async function loadAuraConnectionStatus(brokerClient: SupabaseClient) {
  const brokerResult = await brokerClient.functions.invoke<AuraBrokerStatus>("aura-messaging-broker", {
    body: { action: "status" },
  }).catch(() => ({ data: null }));
  const brokerStatus = brokerResult.data?.ok ? brokerResult.data : null;
  const brokerConnections = normalizeBrokerConnections(brokerStatus);
  return {
    voice: {
      receive: brokerConnections.voice.receive,
      send: brokerConnections.voice.send,
      recording: brokerConnections.voice.recording,
      phone: brokerConnections.voice.phone,
    },
    quo: {
      receive: brokerConnections.quo.receive || Boolean(process.env.AURA_QUO_WEBHOOK_SIGNING_SECRET && process.env.AURA_QUO_PHONE_NUMBER_IDS),
      send: brokerConnections.quo.send || canSendAuraQuoText(),
    },
    whatsapp: {
      provider: brokerConnections.whatsapp.provider,
      receive:
        brokerConnections.whatsapp.receive ||
        Boolean(process.env.AURA_WHATSAPP_APP_SECRET && process.env.AURA_WHATSAPP_VERIFY_TOKEN) ||
        canUseTwilioWhatsApp(),
      send: brokerConnections.whatsapp.send || canSendAuraWhatsApp(),
      health: normalizeWhatsAppHealth(brokerStatus),
    },
    email: {
      receive: brokerConnections.email.receive || Boolean(process.env.RESEND_API_KEY && process.env.AURA_RESEND_WEBHOOK_SECRET && process.env.AURA_RESEND_INBOUND_ADDRESS),
      send: brokerConnections.email.send || canSendAuraEmail(),
    },
  };
}

export async function loadAuraDashboard(supabase: SupabaseClient, brokerClient: SupabaseClient = supabase) {
  const [intakesResult, contactsResult, leadsResult, tasksResult, communicationsResult, customersResult, brokerResult] = await Promise.all([
    supabase
      .from("aura_intakes")
      .select("id, sender_phone, message_text, proposal, status, confirmation_code, created_at")
      .in("status", ["pending", "needs_follow_up"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("aura_contacts")
      .select("id, full_name, normalized_phone, email, company, notes, sms_ai_mode, sms_ai_style, auto_create_request_drafts, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("aura_leads")
      .select("id, title, description, location, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("aura_tasks")
      .select("id, title, notes, due_at, priority, status, created_at")
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("aura_communications")
      .select("id, contact_id, provider, channel, direction, counterparty_phone, counterparty_email, subject, body, summary, transcript, next_steps, media, status, duration_seconds, occurred_at, last_event_at, mailbox_address, message_id, in_reply_to, read_at")
      .order("occurred_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, full_name, company_name, phone, email")
      .eq("role", "client")
      .eq("is_active", true)
      .limit(500),
    brokerClient.functions.invoke<AuraBrokerStatus>("aura-messaging-broker", {
      body: { action: "status" },
    }),
  ]);

  const firstError = intakesResult.error || contactsResult.error || leadsResult.error || tasksResult.error || communicationsResult.error || customersResult.error;
  if (firstError) throw new Error(`Failed to load Aura dashboard: ${firstError.message}`);
  const brokerStatus = brokerResult.data?.ok ? brokerResult.data : null;
  const brokerConnections = normalizeBrokerConnections(brokerStatus);

  return {
    intakes: (intakesResult.data || []) as AuraIntakeRow[],
    contacts: (contactsResult.data || []) as AuraContactRow[],
    leads: (leadsResult.data || []) as AuraLeadRow[],
    tasks: (tasksResult.data || []) as AuraTaskRow[],
    communications: normalizeAuraCommunications(communicationsResult.data),
    customers: (customersResult.data || []) as AuraCustomerIdentity[],
    connections: {
      voice: {
        receive: brokerConnections.voice.receive,
        send: brokerConnections.voice.send,
        recording: brokerConnections.voice.recording,
        phone: brokerConnections.voice.phone,
      },
      quo: {
        receive: brokerConnections.quo.receive || Boolean(process.env.AURA_QUO_WEBHOOK_SIGNING_SECRET && process.env.AURA_QUO_PHONE_NUMBER_IDS),
        send: brokerConnections.quo.send || canSendAuraQuoText(),
      },
      whatsapp: {
        provider: brokerConnections.whatsapp.provider,
        receive:
          brokerConnections.whatsapp.receive ||
          Boolean(process.env.AURA_WHATSAPP_APP_SECRET && process.env.AURA_WHATSAPP_VERIFY_TOKEN) ||
          canUseTwilioWhatsApp(),
        send: brokerConnections.whatsapp.send || canSendAuraWhatsApp(),
        health: normalizeWhatsAppHealth(brokerStatus),
      },
      email: {
        receive: brokerConnections.email.receive || Boolean(process.env.RESEND_API_KEY && process.env.AURA_RESEND_WEBHOOK_SECRET && process.env.AURA_RESEND_INBOUND_ADDRESS),
        send: brokerConnections.email.send || canSendAuraEmail(),
      },
    },
  };
}

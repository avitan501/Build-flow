import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { canSendAuraEmail, canSendAuraQuoText } from "@/lib/aura/communications";
import { canSendAuraWhatsApp } from "@/lib/aura/whatsapp";

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
  media: Array<{ url?: string; type?: string; duration?: number }>;
  status: string | null;
  duration_seconds: number | null;
  occurred_at: string;
};

export async function loadAuraDashboard(supabase: SupabaseClient) {
  const [intakesResult, contactsResult, leadsResult, tasksResult, communicationsResult] = await Promise.all([
    supabase
      .from("aura_intakes")
      .select("id, sender_phone, message_text, proposal, status, confirmation_code, created_at")
      .in("status", ["pending", "needs_follow_up"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("aura_contacts")
      .select("id, full_name, normalized_phone, email, company, notes, created_at")
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
      .select("id, contact_id, provider, channel, direction, counterparty_phone, counterparty_email, subject, body, summary, transcript, next_steps, media, status, duration_seconds, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = intakesResult.error || contactsResult.error || leadsResult.error || tasksResult.error || communicationsResult.error;
  if (firstError) throw new Error(`Failed to load Aura dashboard: ${firstError.message}`);

  return {
    intakes: (intakesResult.data || []) as AuraIntakeRow[],
    contacts: (contactsResult.data || []) as AuraContactRow[],
    leads: (leadsResult.data || []) as AuraLeadRow[],
    tasks: (tasksResult.data || []) as AuraTaskRow[],
    communications: (communicationsResult.data || []) as AuraCommunicationRow[],
    connections: {
      quo: {
        receive: Boolean(process.env.AURA_QUO_WEBHOOK_SIGNING_SECRET && process.env.AURA_QUO_PHONE_NUMBER_IDS),
        send: canSendAuraQuoText(),
      },
      whatsapp: {
        receive: Boolean(process.env.AURA_WHATSAPP_APP_SECRET && process.env.AURA_WHATSAPP_VERIFY_TOKEN),
        send: canSendAuraWhatsApp(),
      },
      email: {
        receive: Boolean(process.env.RESEND_API_KEY && process.env.AURA_RESEND_WEBHOOK_SECRET && process.env.AURA_RESEND_INBOUND_ADDRESS),
        send: canSendAuraEmail(),
      },
    },
  };
}

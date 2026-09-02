import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeAuraCommunications,
  type AuraCommunicationRow,
} from "@/lib/aura/dashboard";
import {
  communicationHistoryCursor,
  parseCommunicationHistoryCursor,
} from "@/lib/aura/communication-history-cursor";
import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/identity";

export const COMMUNICATION_HISTORY_PAGE_SIZE = 80;

const HISTORY_CHANNELS = new Set(["call", "sms", "whatsapp", "email"]);
export type CommunicationHistoryPage = {
  communications: AuraCommunicationRow[];
  cursor: string | null;
  hasMore: boolean;
};

export async function loadCommunicationHistoryPage(input: {
  cursor?: string | null;
  pageSize?: number;
  channel?: string | null;
  phone?: string | null;
  email?: string | null;
  query?: string | null;
}, reader: SupabaseClient): Promise<CommunicationHistoryPage> {
  const parsedCursor = input.cursor ? parseCommunicationHistoryCursor(input.cursor) : null;
  if (input.cursor && !parsedCursor) throw new Error("invalid_communication_history_cursor");
  const channel = input.channel && HISTORY_CHANNELS.has(input.channel) ? input.channel : null;
  const pageSize = Math.min(Math.max(Math.floor(input.pageSize || COMMUNICATION_HISTORY_PAGE_SIZE), 1), 100);
  const phone = normalizeAuraPhone(input.phone || "") || null;
  const email = normalizeAuraEmail(input.email || "") || null;
  const query = String(input.query || "").trim().slice(0, 160) || null;
  const { data, error } = await reader.rpc("staff_load_aura_communication_history_page", {
    p_before_occurred_at: parsedCursor?.occurredAt || null,
    p_before_id: parsedCursor?.id || null,
    p_page_size: pageSize,
    p_channel: channel,
    p_phone: phone,
    p_email: email,
    p_query: query,
  });
  if (error) throw new Error(`communication_history_unavailable:${error.code || "database"}`);
  const normalized = normalizeAuraCommunications(data as unknown[] | null);
  const hasMore = normalized.length > pageSize;
  const communications = normalized.slice(0, pageSize);
  return {
    communications,
    cursor: hasMore && communications.length
      ? communicationHistoryCursor(communications[communications.length - 1])
      : null,
    hasMore,
  };
}

export function mergeCommunicationHistory(...pages: AuraCommunicationRow[][]) {
  const merged = new Map<string, AuraCommunicationRow>();
  for (const row of pages.flat()) merged.set(row.id, row);
  return [...merged.values()].sort((left, right) => {
    const occurredDifference = Date.parse(right.occurred_at) - Date.parse(left.occurred_at);
    return occurredDifference || right.id.localeCompare(left.id);
  });
}

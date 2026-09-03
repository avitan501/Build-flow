import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCallerIdentity, type CallerIdentityCandidate, type CallerIdentityKind } from "@/lib/aura/caller-identity";
import { loadAuraCommunicationLinks } from "@/lib/aura/email-links";
import { normalizeAuraPhone } from "@/lib/aura/identity";
import { withManagerCallerIdentity, type ManagerNotificationEvent } from "@/lib/manager-notification-feed";
import type { ShopQualificationSettings, SupplierRoutingOption } from "@/lib/shop-qualification";

type QueueRow = Omit<ManagerNotificationEvent, "read_at">;
type ReadRow = { notification_id: number; read_at: string };

const queueSelection = "id,event_type,title,body,href,created_at,processed_at";

type IdentityRecord = { id: string; kind: CallerIdentityKind; name: string; company: string; phone: string | null; canonicalKey: string };
type CommunicationIdentityRow = { id: string; counterparty_phone: string | null };
type CommunicationLinkRow = { communication_id: string; entity_type: "client" | "lead" | "supplier" | "material_request"; entity_id: string; entity_label: string };

function communicationIdFromHref(href: string) {
  try {
    return new URL(href, "https://avantia.local").searchParams.get("communication") || "";
  } catch {
    return "";
  }
}

function identityRecordCandidate(record: IdentityRecord, source: CallerIdentityCandidate["source"] = "directory"): CallerIdentityCandidate {
  return { ...record, source };
}

async function enrichManagerCallerIdentities(
  supabase: SupabaseClient,
  events: ManagerNotificationEvent[],
) {
  const communicationIds = [...new Set(events
    .filter((event) => event.event_type === "call_message")
    .map((event) => communicationIdFromHref(event.href))
    .filter(Boolean))];
  if (!communicationIds.length) return events;

  const [communicationResult, contactsResult, customersResult, leadsResult, suppliersResult] = await Promise.all([
    supabase.from("aura_communications").select("id,counterparty_phone").in("id", communicationIds).returns<CommunicationIdentityRow[]>(),
    supabase.from("aura_contacts").select("id,full_name,normalized_phone,company,notes").limit(1000),
    supabase.from("profiles").select("id,full_name,company_name,phone").eq("role", "client").limit(1000),
    supabase.from("manager_outreach_leads").select("id,full_name,company_name,phone").limit(1000),
    supabase.rpc("staff_load_supplier_directory_snapshot"),
  ]);
  const communications = communicationResult.data ?? [];
  const eventPhoneByCommunicationId = new Map(communications.map((row) => [row.id, normalizeAuraPhone(row.counterparty_phone)]));
  const eventPhones = [...new Set(eventPhoneByCommunicationId.values().filter(Boolean))] as string[];
  if (!eventPhones.length) return events;

  const priorResult = await supabase
    .from("aura_communications")
    .select("id,counterparty_phone")
    .in("counterparty_phone", eventPhones)
    .order("occurred_at", { ascending: false })
    .limit(100)
    .returns<CommunicationIdentityRow[]>();
  const linkedCommunicationIds = [...new Set([
    ...communicationIds,
    ...(priorResult.data ?? []).map((row) => row.id),
  ])];
  const communicationLinks = linkedCommunicationIds.length
    ? await loadAuraCommunicationLinks(linkedCommunicationIds)
    : [];

  const records: IdentityRecord[] = [
    ...((customersResult.data ?? []) as Array<{ id: string; full_name: string | null; company_name: string | null; phone: string | null }>).map((row) => ({
      id: row.id, kind: "customer" as const, name: row.full_name || row.company_name || "Unnamed customer", company: row.company_name || "", phone: row.phone, canonicalKey: `customer:${row.id}`,
    })),
    ...((leadsResult.data ?? []) as Array<{ id: string; full_name: string | null; company_name: string | null; phone: string | null }>).map((row) => ({
      id: row.id, kind: "lead" as const, name: row.full_name || row.company_name || "Unnamed lead", company: row.company_name || "", phone: row.phone, canonicalKey: `lead:${row.id}`,
    })),
  ];
  const supplierSnapshot = suppliersResult.data as { settings?: ShopQualificationSettings } | null;
  const suppliers = (supplierSnapshot?.settings?.suppliers ?? []).filter((supplier): supplier is SupplierRoutingOption => Boolean(supplier?.id && supplier?.name));
  for (const supplier of suppliers) {
    for (const phone of new Set([supplier.phone, supplier.whatsapp].filter(Boolean))) {
      records.push({ id: supplier.id, kind: "supplier", name: supplier.contactName || supplier.name, company: supplier.name, phone: phone || null, canonicalKey: `supplier:${supplier.id}` });
    }
    for (const contact of supplier.additionalContacts ?? []) {
      if (contact.phone) records.push({ id: supplier.id, kind: "supplier", name: contact.name || supplier.name, company: supplier.name, phone: contact.phone, canonicalKey: `supplier:${supplier.id}` });
    }
  }
  const recordByKey = new Map(records.map((record) => [record.canonicalKey, record]));
  const candidates = records.map((record) => identityRecordCandidate(record));
  for (const contact of (contactsResult.data ?? []) as Array<{ id: string; full_name: string | null; normalized_phone: string | null; company: string | null; notes: string | null }>) {
    const match = contact.notes?.match(/^Avantia link:(customer|lead|supplier):([A-Za-z0-9_-]+)$/);
    const target = match ? recordByKey.get(`${match[1]}:${match[2]}`) : undefined;
    candidates.push(target
      ? { ...identityRecordCandidate(target, "contact-link"), phone: contact.normalized_phone }
      : { canonicalKey: `contact:${contact.id}`, id: contact.id, kind: "contact", name: contact.full_name || contact.company || "Unnamed contact", company: contact.company || "", phone: contact.normalized_phone, source: "directory" });
  }

  const allCommunicationPhones = new Map([
    ...communications,
    ...(priorResult.data ?? []),
  ].map((row) => [row.id, normalizeAuraPhone(row.counterparty_phone)]));
  for (const link of communicationLinks as CommunicationLinkRow[]) {
    if (link.entity_type === "material_request") continue;
    const phone = allCommunicationPhones.get(link.communication_id);
    if (!phone) continue;
    const kind = link.entity_type === "client" ? "customer" : link.entity_type;
    const canonicalKey = `${kind}:${link.entity_id}`;
    const target = recordByKey.get(canonicalKey);
    candidates.push({ canonicalKey, id: link.entity_id, kind, name: target?.name || link.entity_label, company: target?.company || "", phone, source: "communication-link" });
  }

  return events.map((event) => {
    const phone = eventPhoneByCommunicationId.get(communicationIdFromHref(event.href));
    return phone ? withManagerCallerIdentity(event, resolveCallerIdentity(phone, candidates)) : event;
  });
}

export async function loadManagerNotificationFeed(
  supabase: SupabaseClient,
  userId: string,
  limit = 100,
  enrichCallerIdentity = false,
) {
  const { data: queueRows, error: queueError } = await supabase
    .from("manager_push_queue")
    .select(queueSelection)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (queueError) throw new Error(`Notification feed is unavailable: ${queueError.message}`);

  const rows = (queueRows ?? []) as QueueRow[];
  const ids = rows.map((row) => row.id);
  const { data: readRows, error: readError } = ids.length
    ? await supabase
      .from("manager_notification_reads")
      .select("notification_id,read_at")
      .eq("user_id", userId)
      .in("notification_id", ids)
    : { data: [], error: null };
  if (readError) throw new Error(`Notification read state is unavailable: ${readError.message}`);

  const readAtById = new Map(
    ((readRows ?? []) as ReadRow[]).map((row) => [row.notification_id, row.read_at]),
  );
  const events = rows.map((row) => ({ ...row, read_at: readAtById.get(row.id) ?? null }));
  if (!enrichCallerIdentity) return events;
  try {
    return await enrichManagerCallerIdentities(supabase, events);
  } catch {
    // Notification history remains available even when an optional directory source is unavailable.
    return events;
  }
}

export async function markManagerNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds: number[],
) {
  const ids = [...new Set(notificationIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length) return;
  const readAt = new Date().toISOString();
  const { error } = await supabase.from("manager_notification_reads").upsert(
    ids.map((notificationId) => ({ user_id: userId, notification_id: notificationId, read_at: readAt })),
    { onConflict: "user_id,notification_id" },
  );
  if (error) throw new Error(`Notification read state could not be saved: ${error.message}`);
}

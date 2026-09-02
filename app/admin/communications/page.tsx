import { UnifiedCommunicationInbox, type AuraLeadRecipient } from "@/components/buildflow/unified-communication-inbox"
import { after } from "next/server"
import type { SmsReplyDraft } from "@/app/admin/communications/actions"
import { requireManagerPortalProfile } from "@/lib/auth"
import { contactEmailForDisplay } from "@/lib/auth-phone"
import { loadAuraConnectionStatus, type AuraContactRow } from "@/lib/aura/dashboard"
import {
  COMMUNICATION_HISTORY_PAGE_SIZE,
  loadCommunicationHistoryPage,
  mergeCommunicationHistory,
} from "@/lib/aura/communication-history"
import type { AuraCustomerIdentity } from "@/lib/aura/identity"
import { normalizeAuraEmail, normalizeAuraPhone } from "@/lib/aura/identity"
import { syncRecentTwilioWhatsAppMessages } from "@/lib/aura/twilio-whatsapp"
import type { ShopQualificationSettings, SupplierRoutingOption } from "@/lib/shop-qualification"

type ManagerAuraData = {
  ok?: boolean
  contacts?: AuraContactRow[]
  connections?: {
    voice?: { receive: boolean; send: boolean; recording: boolean; phone: string | null }
    quo: { receive: boolean; send: boolean }
    whatsapp: { receive: boolean; send: boolean }
    email: { receive: boolean; send: boolean }
  }
}

async function loadManagerAura(
  supabase: Awaited<ReturnType<typeof requireManagerPortalProfile>>["supabase"],
): Promise<ManagerAuraData | null> {
  const [contactsResult, connections] = await Promise.all([
    supabase
      .from("aura_contacts")
      .select("id,full_name,normalized_phone,email,company,notes,sms_ai_mode,sms_ai_style,auto_create_request_drafts,created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<AuraContactRow[]>(),
    loadAuraConnectionStatus(supabase),
  ])
  if (contactsResult.error) return null
  return {
    ok: true,
    contacts: contactsResult.data ?? [],
    connections,
  }
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string | string[]; communication?: string | string[]; q?: string | string[]; draft?: string | string[]; thread?: string | string[] }>
}) {
  const query = await searchParams
  const requestedChannel = Array.isArray(query.channel) ? query.channel[0] : query.channel
  const requestedSearch = Array.isArray(query.q) ? query.q[0] : query.q
  const requestedCommunication = Array.isArray(query.communication) ? query.communication[0] : query.communication
  const requestedDraft = Array.isArray(query.draft) ? query.draft[0] : query.draft
  const requestedThread = Array.isArray(query.thread) ? query.thread[0] : query.thread
  const initialChannelFilter = requestedChannel === "email-list"
    ? "email"
    : ["all", "call", "sms", "whatsapp", "email"].includes(requestedChannel || "") ? requestedChannel! : "all"
  const { supabase, access } = await requireManagerPortalProfile()
  if (access.customers) after(() => syncRecentTwilioWhatsAppMessages().catch(() => null))
  const exactThread = String(requestedThread || "").trim().slice(0, 160)
  const exactPhone = normalizeAuraPhone(exactThread)
  const exactEmail = normalizeAuraEmail(exactThread)
  const historyPromise = access.customers
    ? Promise.all([
        loadCommunicationHistoryPage({ pageSize: COMMUNICATION_HISTORY_PAGE_SIZE }, supabase),
        exactPhone || exactEmail
          ? loadCommunicationHistoryPage({ pageSize: 60, phone: exactPhone, email: exactEmail }, supabase)
          : requestedSearch?.trim()
            ? loadCommunicationHistoryPage({ pageSize: 60, query: requestedSearch }, supabase)
            : Promise.resolve(null),
      ])
    : Promise.resolve(null)
  const [clientsResult, leadsResult, suppliersResult, requestsResult, smsDraftsResult, aura, historyResult] = await Promise.all([
    access.customers ? supabase.from("profiles").select("id,full_name,email,phone,company_name").eq("role", "client").eq("is_active", true).order("full_name").limit(500) : Promise.resolve({ data: [] }),
    access.customers ? supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone").neq("status", "archived").order("full_name").limit(500).returns<AuraLeadRecipient[]>() : Promise.resolve({ data: [] }),
    access.suppliers ? supabase.rpc("staff_load_supplier_directory_snapshot") : Promise.resolve({ data: null }),
    access.customers ? supabase.from("quote_requests").select("id,title,status").neq("status", "draft").order("updated_at", { ascending: false }).limit(150) : Promise.resolve({ data: [] }),
    access.customers ? supabase.from("aura_sms_reply_drafts").select("id,communication_id,counterparty_phone,reply_text,decision,safety_reason,safety_level,safety_signals,intent,latency_ms,input_tokens,output_tokens,estimated_cost_usd,prompt_version,ai_model,updated_at").in("decision", ["draft", "blocked", "send_failed"]).order("updated_at", { ascending: false }).limit(200).returns<SmsReplyDraft[]>() : Promise.resolve({ data: [] }),
    access.customers
      ? loadManagerAura(supabase)
      : Promise.resolve(null),
    historyPromise,
  ])
  const customers = (clientsResult.data ?? []).map((client) => ({
    ...client,
    email: contactEmailForDisplay(client.email) || null,
  })) as AuraCustomerIdentity[]
  const supplierSnapshot = suppliersResult.data as { settings?: ShopQualificationSettings } | null
  const leads = (leadsResult.data ?? []) as AuraLeadRecipient[]
  const suppliers = (supplierSnapshot?.settings?.suppliers ?? []).filter((supplier): supplier is SupplierRoutingOption => Boolean(supplier?.id && supplier?.name))
  const initialHistory = historyResult?.[0] ?? null
  const contextualHistory = historyResult?.[1] ?? null
  const communications = mergeCommunicationHistory(
    initialHistory?.communications ?? [],
    contextualHistory?.communications ?? [],
  )
  const liveAura = initialHistory && aura?.contacts && aura.connections
    ? {
        communications,
        contacts: aura.contacts,
        customers,
        leads,
        suppliers,
        connections: aura.connections,
      }
    : null

  return <main className="h-[calc(100dvh-4rem)] min-h-0 min-w-0 overflow-hidden bg-[#f5f5f7] p-2 text-slate-950 sm:p-4 lg:h-screen lg:px-6"><div className="mx-auto h-full min-h-0 min-w-0 max-w-[96rem]">{liveAura ? <UnifiedCommunicationInbox communications={liveAura.communications} contacts={liveAura.contacts} customers={liveAura.customers} leads={liveAura.leads} suppliers={liveAura.suppliers} materialRequests={(requestsResult.data ?? []).map((request) => ({ id: request.id, title: request.title, status: request.status }))} smsReplyDrafts={(smsDraftsResult.data ?? []) as SmsReplyDraft[]} connections={liveAura.connections} initialChannelFilter={initialChannelFilter} initialCommunicationId={(requestedCommunication || "").slice(0, 64)} initialQuery={(requestedSearch || "").slice(0, 160)} initialDraft={(requestedDraft || "").slice(0, 1600)} initialThread={exactThread} initialHistoryCursor={initialHistory?.cursor ?? null} initialHistoryHasMore={Boolean(initialHistory?.hasMore)} /> : <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Live phone connections are temporarily unavailable.</p>}</div></main>
}

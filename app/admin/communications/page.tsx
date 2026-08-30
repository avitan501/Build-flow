import { CommunicationCenter } from "@/components/buildflow/communication-center"
import { UnifiedCommunicationInbox, type AuraLeadRecipient } from "@/components/buildflow/unified-communication-inbox"
import type { SmsReplyDraft } from "@/app/admin/communications/actions"
import { requireManagerPortalProfile } from "@/lib/auth"
import { contactEmailForDisplay } from "@/lib/auth-phone"
import type { AuraCommunicationRow, AuraContactRow } from "@/lib/aura/dashboard"
import { loadAuraDashboard, normalizeAuraCommunications } from "@/lib/aura/dashboard"
import type { AuraCustomerIdentity } from "@/lib/aura/identity"
import { syncRecentTwilioWhatsAppMessages } from "@/lib/aura/twilio-whatsapp"
import { COMMUNICATION_LOG_PREFIX, parseCommunicationLog } from "@/lib/manager-command-center"
import { listInboxThreads } from "@/lib/whatsapp-draft-inbox"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ShopQualificationSettings, SupplierRoutingOption } from "@/lib/shop-qualification"

type ManagerAuraData = {
  ok?: boolean
  communications?: AuraCommunicationRow[]
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
  try {
    const result = await supabase.functions.invoke<ManagerAuraData>("aura-messaging-broker", { body: { action: "dashboard" } })
    if (result.data?.ok) return result.data
  } catch {
    // Fall back to the database snapshot when the provider broker is unavailable.
  }

  try {
    const dashboard = await loadAuraDashboard(createAdminClient())
    return {
      ok: true,
      communications: dashboard.communications,
      contacts: dashboard.contacts,
      connections: dashboard.connections,
    }
  } catch {
    return null
  }
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string | string[]; q?: string | string[] }>
}) {
  const query = await searchParams
  const requestedChannel = Array.isArray(query.channel) ? query.channel[0] : query.channel
  const requestedSearch = Array.isArray(query.q) ? query.q[0] : query.q
  const initialChannelFilter = requestedChannel === "email-list"
    ? "email"
    : ["all", "call", "sms", "whatsapp", "email"].includes(requestedChannel || "") ? requestedChannel! : "all"
  const { supabase, access } = await requireManagerPortalProfile()
  if (access.customers) await syncRecentTwilioWhatsAppMessages().catch(() => null)
  const [clientsResult, leadsResult, suppliersResult, requestsResult, smsDraftsResult, logsResult, threads, aura] = await Promise.all([
    access.customers ? supabase.from("profiles").select("id,full_name,email,phone,company_name").eq("role", "client").eq("is_active", true).order("full_name").limit(500) : Promise.resolve({ data: [] }),
    access.customers ? supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone").neq("status", "archived").order("full_name").limit(500).returns<AuraLeadRecipient[]>() : Promise.resolve({ data: [] }),
    access.suppliers ? supabase.rpc("staff_load_supplier_directory_snapshot") : Promise.resolve({ data: null }),
    access.customers ? supabase.from("quote_requests").select("id,title,status").neq("status", "draft").order("updated_at", { ascending: false }).limit(150) : Promise.resolve({ data: [] }),
    access.customers ? supabase.from("aura_sms_reply_drafts").select("id,communication_id,counterparty_phone,reply_text,decision,safety_reason,ai_model,updated_at").in("decision", ["draft", "blocked", "send_failed"]).order("updated_at", { ascending: false }).limit(200).returns<SmsReplyDraft[]>() : Promise.resolve({ data: [] }),
    supabase.from("manager_goals").select("details,updated_at").like("details", `${COMMUNICATION_LOG_PREFIX}%`).order("updated_at", { ascending: false }).limit(100),
    listInboxThreads().catch(() => []),
    access.customers
      ? loadManagerAura(supabase)
      : Promise.resolve(null),
  ])
  const customers = (clientsResult.data ?? []).map((client) => ({
    ...client,
    email: contactEmailForDisplay(client.email) || null,
  })) as AuraCustomerIdentity[]
  const clients = customers.map((client) => ({ id: String(client.id), name: String(client.full_name || client.email || "Client") }))
  const logs = (logsResult.data ?? []).map((row) => parseCommunicationLog(row.details)).filter((log) => log !== null)
  const supplierSnapshot = suppliersResult.data as { settings?: ShopQualificationSettings } | null
  const leads = (leadsResult.data ?? []) as AuraLeadRecipient[]
  const suppliers = (supplierSnapshot?.settings?.suppliers ?? []).filter((supplier): supplier is SupplierRoutingOption => Boolean(supplier?.id && supplier?.name))
  const communications = normalizeAuraCommunications(aura?.communications ?? [])
  const liveAura = aura?.communications && aura.contacts && aura.connections
    ? {
        communications,
        contacts: aura.contacts,
        customers,
        leads,
        suppliers,
        connections: aura.connections,
      }
    : null

  return <main className="h-[calc(100dvh-4rem)] min-h-0 min-w-0 overflow-hidden bg-[#f5f5f7] p-2 text-slate-950 sm:p-4 lg:h-screen lg:px-6"><div className="mx-auto h-full min-h-0 min-w-0 max-w-[96rem]">{liveAura ? <UnifiedCommunicationInbox communications={liveAura.communications} contacts={liveAura.contacts} customers={liveAura.customers} leads={liveAura.leads} suppliers={liveAura.suppliers} materialRequests={(requestsResult.data ?? []).map((request) => ({ id: request.id, title: request.title, status: request.status }))} smsReplyDrafts={(smsDraftsResult.data ?? []) as SmsReplyDraft[]} connections={liveAura.connections} initialChannelFilter={initialChannelFilter} initialQuery={(requestedSearch || "").slice(0, 160)} /> : <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Live phone connections are temporarily unavailable.</p>}<details className="mt-3 hidden rounded-lg border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Manual communication log</summary><div className="mt-4"><CommunicationCenter clients={clients} logs={logs} threads={threads} /></div></details></div></main>
}

import { CommunicationCenter } from "@/components/buildflow/communication-center"
import { AuraCommunicationWorkspace, type AuraLeadRecipient } from "@/components/buildflow/aura-communication-workspace"
import { requireManagerPortalProfile } from "@/lib/auth"
import type { AuraCommunicationRow, AuraContactRow } from "@/lib/aura/dashboard"
import { loadAuraDashboard } from "@/lib/aura/dashboard"
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
  const initialChannelFilter = ["all", "call", "sms", "whatsapp", "email"].includes(requestedChannel || "") ? requestedChannel! : "all"
  const { supabase, access } = await requireManagerPortalProfile()
  if (access.customers) await syncRecentTwilioWhatsAppMessages().catch(() => null)
  const [clientsResult, leadsResult, suppliersResult, logsResult, threads, aura] = await Promise.all([
    access.customers ? supabase.from("profiles").select("id,full_name,email,phone,company_name").eq("role", "client").eq("is_active", true).order("full_name").limit(500) : Promise.resolve({ data: [] }),
    access.customers ? supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone").neq("status", "archived").order("full_name").limit(500).returns<AuraLeadRecipient[]>() : Promise.resolve({ data: [] }),
    access.suppliers ? supabase.rpc("staff_load_supplier_directory_snapshot") : Promise.resolve({ data: null }),
    supabase.from("manager_goals").select("details,updated_at").like("details", `${COMMUNICATION_LOG_PREFIX}%`).order("updated_at", { ascending: false }).limit(100),
    listInboxThreads().catch(() => []),
    access.customers
      ? loadManagerAura(supabase)
      : Promise.resolve(null),
  ])
  const clients = (clientsResult.data ?? []).map((client) => ({ id: String(client.id), name: String(client.full_name || client.email || "Client") }))
  const logs = (logsResult.data ?? []).map((row) => parseCommunicationLog(row.details)).filter((log) => log !== null)
  const customers = (clientsResult.data ?? []) as AuraCustomerIdentity[]
  const supplierSnapshot = suppliersResult.data as { settings?: ShopQualificationSettings } | null
  const leads = (leadsResult.data ?? []) as AuraLeadRecipient[]
  const suppliers = (supplierSnapshot?.settings?.suppliers ?? []).filter((supplier): supplier is SupplierRoutingOption => Boolean(supplier?.id && supplier?.name))
  const liveAura = aura?.communications && aura.contacts && aura.connections
    ? {
        communications: aura.communications,
        contacts: aura.contacts,
        customers,
        leads,
        suppliers,
        connections: aura.connections,
      }
    : null

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9"><div className="mx-auto max-w-7xl"><header className="border-b border-slate-200 pb-5"><h1 className="text-3xl font-semibold sm:text-4xl">Messages &amp; Calls</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Call customers, leads, or suppliers and manage text, WhatsApp, and email from one screen.</p></header>{liveAura ? <div className="mt-5"><AuraCommunicationWorkspace communications={liveAura.communications} contacts={liveAura.contacts} customers={liveAura.customers} leads={liveAura.leads} suppliers={liveAura.suppliers} connections={liveAura.connections} initialChannelFilter={initialChannelFilter} initialQuery={(requestedSearch || "").slice(0, 160)} /></div> : <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Live phone connections are temporarily unavailable.</p>}<details className="mt-6 rounded-lg border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Manual communication log</summary><div className="mt-5"><CommunicationCenter clients={clients} logs={logs} threads={threads} /></div></details></div></main>
}

import { CommunicationCenter } from "@/components/buildflow/communication-center"
import { UnifiedCommunicationInbox, type AuraLeadRecipient } from "@/components/buildflow/unified-communication-inbox"
import Link from "next/link"
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

function emailDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(date)
}

function EmailInboxView({ communications }: { communications: AuraCommunicationRow[] }) {
  const emails = communications.filter((item) => item.channel === "email")
  const unread = emails.filter((item) => item.direction === "incoming" && !item.read_at).length
  return <main className="min-h-screen bg-[#f5f5f7] px-3 py-4 text-slate-950 sm:px-5 lg:px-7"><div className="mx-auto max-w-5xl"><header className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Communications</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Email Inbox</h1><p className="mt-1 text-sm text-slate-600">Incoming and outgoing Avantia email in one place.</p></div><nav className="flex flex-wrap gap-2 text-xs font-bold"><Link href="/admin/communications?channel=all" className="rounded-full border border-slate-300 bg-white px-3 py-2">All messages</Link><Link href="/admin/communications?channel=sms" className="rounded-full border border-slate-300 bg-white px-3 py-2">Texts</Link><Link href="/admin/communications?channel=call" className="rounded-full border border-slate-300 bg-white px-3 py-2">Calls</Link></nav></header><section className="mb-3 flex gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{emails.length} emails</span><span className="rounded-full bg-sky-100 px-3 py-1.5 text-sky-800">{unread} unread</span></section><section className="grid gap-3" aria-label="Email messages">{emails.map((item) => { const incoming = item.direction !== "outgoing"; const links = Array.isArray(item.links) ? item.links : []; return <article key={item.id} className={`rounded-xl border bg-white p-4 shadow-sm ${incoming && !item.read_at ? "border-sky-300 ring-1 ring-sky-100" : "border-slate-200"}`}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${incoming ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>{incoming ? "Received" : "Sent"}</span>{incoming && !item.read_at ? <span className="text-[10px] font-bold uppercase text-sky-700">Unread</span> : null}</div><h2 className="mt-2 break-words text-base font-bold">{item.subject || "No subject"}</h2><p className="mt-1 break-all text-xs text-slate-500">{item.counterparty_email || "Email address unavailable"}</p></div><time className="shrink-0 text-xs text-slate-500">{emailDate(item.occurred_at)}</time></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.body || "This email has no text content."}</p>{item.media?.length ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{item.media.length} attachment{item.media.length === 1 ? "" : "s"} included</p> : null}<div className="mt-3 flex flex-wrap items-center gap-2">{links.map((link) => <Link key={`${link.entity_type}:${link.entity_id}`} href={link.entity_type === "material_request" ? `/owner/materials/requests/${link.entity_id}` : link.entity_type === "supplier" ? `/admin/vendors?q=${encodeURIComponent(link.entity_label)}` : "/admin/users"} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800">{link.entity_type === "material_request" ? "Request" : link.entity_type === "supplier" ? "Supplier" : link.entity_type === "client" ? "Client" : "Lead"} · {link.entity_label}</Link>)}{item.counterparty_email ? <a href={`mailto:${encodeURIComponent(item.counterparty_email)}?subject=${encodeURIComponent(item.subject?.startsWith("Re:") ? item.subject : `Re: ${item.subject || "Avantia Build"}`)}`} className="ml-auto rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white">Reply</a> : null}</div></article> })}{!emails.length ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><h2 className="font-bold">No email yet</h2><p className="mt-1 text-sm text-slate-500">New incoming and outgoing messages will appear here.</p></div> : null}</section></div></main>
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
  if (requestedChannel === "email-list") {
    const emailAura = access.customers ? await loadManagerAura(supabase) : null
    return <EmailInboxView communications={normalizeAuraCommunications(emailAura?.communications ?? [])} />
  }
  const [clientsResult, leadsResult, suppliersResult, requestsResult, logsResult, threads, aura] = await Promise.all([
    access.customers ? supabase.from("profiles").select("id,full_name,email,phone,company_name").eq("role", "client").eq("is_active", true).order("full_name").limit(500) : Promise.resolve({ data: [] }),
    access.customers ? supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone").neq("status", "archived").order("full_name").limit(500).returns<AuraLeadRecipient[]>() : Promise.resolve({ data: [] }),
    access.suppliers ? supabase.rpc("staff_load_supplier_directory_snapshot") : Promise.resolve({ data: null }),
    access.customers ? supabase.from("quote_requests").select("id,title,status").neq("status", "draft").order("updated_at", { ascending: false }).limit(150) : Promise.resolve({ data: [] }),
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

  return <main className="min-h-screen bg-[#f5f5f7] px-2 py-2 text-slate-950 sm:px-4 sm:py-4 lg:px-6"><div className="mx-auto max-w-[96rem]">{liveAura ? <UnifiedCommunicationInbox communications={liveAura.communications} contacts={liveAura.contacts} customers={liveAura.customers} leads={liveAura.leads} suppliers={liveAura.suppliers} materialRequests={(requestsResult.data ?? []).map((request) => ({ id: request.id, title: request.title, status: request.status }))} connections={liveAura.connections} initialChannelFilter={initialChannelFilter} initialQuery={(requestedSearch || "").slice(0, 160)} /> : <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Live phone connections are temporarily unavailable.</p>}<details className="mt-3 rounded-lg border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Manual communication log</summary><div className="mt-4"><CommunicationCenter clients={clients} logs={logs} threads={threads} /></div></details></div></main>
}

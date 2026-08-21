import { CommunicationCenter } from "@/components/buildflow/communication-center"
import { AuraCommunicationWorkspace } from "@/components/buildflow/aura-communication-workspace"
import { requireManagerPortalProfile } from "@/lib/auth"
import { loadAuraDashboard } from "@/lib/aura/dashboard"
import { COMMUNICATION_LOG_PREFIX, parseCommunicationLog } from "@/lib/manager-command-center"
import { createAdminClient } from "@/lib/supabase/admin"
import { listInboxThreads } from "@/lib/whatsapp-draft-inbox"

export default async function CommunicationsPage() {
  const { supabase, access } = await requireManagerPortalProfile()
  const [clientsResult, logsResult, threads, aura] = await Promise.all([
    access.customers ? supabase.from("profiles").select("id,full_name,email").eq("role", "client").eq("is_active", true).order("full_name").limit(500) : Promise.resolve({ data: [] }),
    supabase.from("manager_goals").select("details,updated_at").like("details", `${COMMUNICATION_LOG_PREFIX}%`).order("updated_at", { ascending: false }).limit(100),
    listInboxThreads().catch(() => []),
    access.customers
      ? loadAuraDashboard(createAdminClient(), supabase).catch(() => null)
      : Promise.resolve(null),
  ])
  const clients = (clientsResult.data ?? []).map((client) => ({ id: String(client.id), name: String(client.full_name || client.email || "Client") }))
  const logs = (logsResult.data ?? []).map((row) => parseCommunicationLog(row.details)).filter((log) => log !== null)
  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9"><div className="mx-auto max-w-7xl"><header className="border-b border-slate-200 pb-5"><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Manager Portal</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Communications</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Call customers and manage text, WhatsApp, and email from one screen.</p></header>{aura ? <div className="mt-5"><AuraCommunicationWorkspace communications={aura.communications} contacts={aura.contacts} connections={aura.connections} /></div> : <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Live phone connections are temporarily unavailable.</p>}<details className="mt-6 rounded-lg border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Manual communication log</summary><div className="mt-5"><CommunicationCenter clients={clients} logs={logs} threads={threads} /></div></details></div></main>
}

"use client"

import { ExternalLink, LoaderCircle, MessageCircle, PhoneCall, Plus, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { saveCommunicationLogAction } from "@/app/admin/communications/actions"
import type { CommunicationLog } from "@/lib/manager-command-center"
import type { InboxThread } from "@/lib/whatsapp-draft-inbox"

const QUO_URL = "https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602"
const WHATSAPP_URL = "https://web.whatsapp.com/"

type ClientOption = { id: string; name: string }

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

export function CommunicationCenter({ clients, logs, threads }: { clients: ClientOption[]; logs: CommunicationLog[]; threads: InboxThread[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [channel, setChannel] = useState<"call" | "whatsapp">("call")
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound")
  const [summary, setSummary] = useState("")
  const [outcome, setOutcome] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function save() {
    setError("")
    startTransition(async () => {
      const result = await saveCommunicationLogAction({ clientId, channel, direction, summary, outcome })
      if (!result.ok) { setError(result.error); return }
      setSummary(""); setOutcome(""); setMessage("Communication added to the client log."); setOpen(false); router.refresh()
    })
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="grid gap-5">
      <section className="grid grid-cols-2 gap-3">
        <a href={QUO_URL} target="_blank" rel="noreferrer" className="flex min-h-20 items-center gap-3 rounded-lg bg-slate-950 p-4 text-white"><PhoneCall className="h-5 w-5" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Open Calls & Messages</span><span className="mt-1 block text-xs text-slate-300">Quo company inbox</span></span><ExternalLink className="h-4 w-4" /></a>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex min-h-20 items-center gap-3 rounded-lg bg-[#167f55] p-4 text-white"><MessageCircle className="h-5 w-5" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Open WhatsApp</span><span className="mt-1 block text-xs text-emerald-100">Company conversations</span></span><ExternalLink className="h-4 w-4" /></a>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-semibold">Client communication log</h2><p className="mt-1 text-xs text-slate-500">Calls and WhatsApp notes linked to a client</p></div><button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Log contact</button></header>
        {open ? <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold">Client<select value={clientId} onChange={(event) => setClientId(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Choose client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs font-semibold">Channel<select value={channel} onChange={(event) => setChannel(event.target.value as "call" | "whatsapp")} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="call">Call</option><option value="whatsapp">WhatsApp</option></select></label><label className="grid gap-1 text-xs font-semibold">Direction<select value={direction} onChange={(event) => setDirection(event.target.value as "outbound" | "inbound")} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="outbound">Outgoing</option><option value="inbound">Incoming</option></select></label></div>
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} maxLength={1500} placeholder="What was discussed?" className="rounded-md border border-slate-300 bg-white p-3 text-sm font-normal" /></label>
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Next step / outcome<input value={outcome} onChange={(event) => setOutcome(event.target.value)} maxLength={500} placeholder="Waiting for list, call tomorrow, quote sent..." className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal" /></label>
          {error ? <p className="text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}<button type="button" onClick={save} disabled={pending || !clientId || !summary.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2 sm:justify-self-end">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save to client log</button>
        </div> : null}
        {message ? <p className="border-b border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        {logs.length ? <div className="divide-y divide-slate-100">{logs.map((log) => <article key={log.id} className="flex gap-3 p-4"><span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${log.channel === "call" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>{log.channel === "call" ? <PhoneCall className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{log.clientName}</h3><time className="text-[11px] text-slate-500">{formatTime(log.createdAt)}</time></div><p className="mt-1 text-sm leading-6 text-slate-700">{log.summary}</p>{log.outcome ? <p className="mt-1 text-xs font-semibold text-[#0066cc]">Next: {log.outcome}</p> : null}</div></article>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No communication logs yet.</p>}
      </section>
    </div>

    <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-200 p-4"><h2 className="font-semibold">WhatsApp inbox</h2><p className="mt-1 text-xs text-slate-500">Imported company threads</p></header>{threads.length ? <div className="divide-y divide-slate-100">{threads.slice(0, 12).map((thread) => <a key={thread.id} href={`/admin/communications?channel=whatsapp&q=${encodeURIComponent(thread.phone || thread.contactName)}`} className="block p-4 hover:bg-slate-50"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{thread.contactName}</span>{thread.unreadCount ? <span className="rounded-full bg-[#0071e3] px-2 py-0.5 text-[10px] font-bold text-white">{thread.unreadCount}</span> : null}</div><p className="mt-1 truncate text-xs text-slate-500">{thread.lastMessage}</p></a>)}</div> : <p className="p-5 text-sm leading-6 text-slate-500">No WhatsApp threads have been imported yet. Open WhatsApp above and record the result in the client log.</p>}</aside>
  </div>
}

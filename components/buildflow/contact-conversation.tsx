import { ArrowDownLeft, ArrowUpRight, CheckCheck, CircleAlert, Clock3, Mail, MessageCircle, Phone, Smartphone } from "lucide-react"
import Link from "next/link"

export type DirectoryConversationEntry = {
  id: string
  channel: "call" | "sms" | "whatsapp" | "email" | "note"
  direction: "incoming" | "outgoing" | "internal" | null
  message: string
  status: string | null
  occurredAt: string
}

function formatConversationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date)
}

function ChannelIcon({ channel }: { channel: DirectoryConversationEntry["channel"] }) {
  const Icon = channel === "call" ? Phone : channel === "whatsapp" ? MessageCircle : channel === "email" ? Mail : Smartphone
  return <Icon className="h-3.5 w-3.5" aria-hidden="true" />
}

function ConversationRow({ entry }: { entry: DirectoryConversationEntry }) {
  const failed = entry.status === "failed" || entry.status === "undelivered"
  const complete = entry.status === "delivered" || entry.status === "read" || entry.status === "received"
  const incoming = entry.direction === "incoming"
  const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight
  const StatusIcon = failed ? CircleAlert : complete ? CheckCheck : Clock3
  const channelTone = entry.channel === "whatsapp" ? "bg-emerald-100 text-emerald-700" : entry.channel === "email" ? "bg-violet-100 text-violet-700" : entry.channel === "call" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
  return <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 py-2.5">
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${channelTone}`}><ChannelIcon channel={entry.channel} /></span>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${incoming ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}><DirectionIcon className="h-3 w-3" />{incoming ? "Received" : "Sent"}</span>
        <span className={`rounded-full px-1.5 py-0.5 ${channelTone}`}>{entry.channel}</span>
        {entry.status ? <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${failed ? "bg-rose-100 text-rose-700" : complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}><StatusIcon className="h-3 w-3" />{entry.status}</span> : null}
        <time className="ml-auto font-medium normal-case text-slate-400">{formatConversationDate(entry.occurredAt)}</time>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-700">{entry.message || "Communication recorded"}</p>
    </div>
  </div>
}

export function ContactConversation({ entries, historyHref }: { entries: DirectoryConversationEntry[]; historyHref?: string }) {
  if (!entries.length) {
    return <section className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3" aria-label="Conversation">
      <p className="text-[11px] font-bold uppercase text-slate-400">Conversation</p>
      <p className="mt-1 text-xs text-slate-500">No calls or messages yet.</p>
      {historyHref ? <Link href={historyHref} className="mt-2 inline-flex text-xs font-semibold text-[#0066cc]">Open WhatsApp log</Link> : null}
    </section>
  }

  const latest = entries[0]
  return <section className="rounded-md border border-slate-200 bg-slate-50 px-3" aria-label="Conversation">
    <div className="flex items-center justify-between border-b border-slate-200 py-2">
      <p className="text-[11px] font-bold uppercase text-slate-600">Conversation</p>
      <div className="flex items-center gap-2">{historyHref ? <Link href={historyHref} className="text-[10px] font-bold text-[#0066cc]">WhatsApp log</Link> : null}<span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{entries.length}</span></div>
    </div>
    <ConversationRow entry={latest} />
    {entries.length > 1 ? <details className="border-t border-slate-200">
      <summary className="cursor-pointer list-none py-2 text-xs font-semibold text-[#0066cc]">View earlier messages ({entries.length - 1})</summary>
      <div className="divide-y divide-slate-200">{entries.slice(1, 12).map((entry) => <ConversationRow key={entry.id} entry={entry} />)}</div>
    </details> : null}
  </section>
}

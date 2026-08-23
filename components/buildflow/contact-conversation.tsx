import { Mail, MessageCircle, Phone, Smartphone } from "lucide-react"

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
  return <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 py-2.5">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 text-[#0066cc]"><ChannelIcon channel={entry.channel} /></span>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase text-slate-500">
        <span>{entry.channel} · {entry.direction || "activity"}</span>
        {entry.status ? <span className={failed ? "text-rose-700" : "text-emerald-700"}>{entry.status}</span> : null}
        <time className="ml-auto font-medium normal-case text-slate-400">{formatConversationDate(entry.occurredAt)}</time>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-700">{entry.message || "Communication recorded"}</p>
    </div>
  </div>
}

export function ContactConversation({ entries }: { entries: DirectoryConversationEntry[] }) {
  if (!entries.length) {
    return <section className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3" aria-label="Conversation">
      <p className="text-[11px] font-bold uppercase text-slate-400">Conversation</p>
      <p className="mt-1 text-xs text-slate-500">No calls or messages yet.</p>
    </section>
  }

  const latest = entries[0]
  return <section className="rounded-md border border-slate-200 bg-slate-50 px-3" aria-label="Conversation">
    <div className="flex items-center justify-between border-b border-slate-200 py-2">
      <p className="text-[11px] font-bold uppercase text-slate-600">Conversation</p>
      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{entries.length}</span>
    </div>
    <ConversationRow entry={latest} />
    {entries.length > 1 ? <details className="border-t border-slate-200">
      <summary className="cursor-pointer list-none py-2 text-xs font-semibold text-[#0066cc]">View earlier messages ({entries.length - 1})</summary>
      <div className="divide-y divide-slate-200">{entries.slice(1, 12).map((entry) => <ConversationRow key={entry.id} entry={entry} />)}</div>
    </details> : null}
  </section>
}

import { ArrowDownLeft, ArrowUpRight, Mail } from "lucide-react"
import Link from "next/link"

export type RelatedEmailItem = {
  id: string
  direction: "incoming" | "outgoing" | "internal" | null
  counterparty_email: string | null
  subject: string | null
  body: string | null
  occurred_at: string
  status: string | null
  media?: Array<{ name?: string; type?: string }>
}

function emailState(email: RelatedEmailItem) {
  const incoming = email.direction === "incoming"
  const clearQuotePdf = incoming && (email.media ?? []).some((file) => {
    const text = `${file.name ?? ""} ${email.subject ?? ""}`
    return file.type === "application/pdf" && /\b(quote|estimate|proposal|pricing)\b/i.test(text)
  })
  if (clearQuotePdf) return { label: "Review quote", tone: "bg-violet-50 text-violet-800" }
  if (incoming && email.body?.includes("?")) return { label: "Needs information", tone: "bg-amber-50 text-amber-900" }
  if (incoming) return { label: "Supplier replied", tone: "bg-emerald-50 text-emerald-800" }
  if (email.status === "read") return { label: "Opened", tone: "bg-sky-50 text-sky-800" }
  if (["failed", "bounced", "complained", "suppressed"].includes(email.status ?? "")) return { label: "Failed", tone: "bg-rose-50 text-rose-800" }
  if (email.status === "delivered") return { label: "Delivered · not opened", tone: "bg-slate-100 text-slate-700" }
  return { label: "Sent · not opened", tone: "bg-slate-100 text-slate-700" }
}

export function RelatedEmailTimeline({ title = "Emails for this request", emails }: { title?: string; emails: RelatedEmailItem[] }) {
  return <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#0066cc]" /><div><h2 className="text-sm font-bold">{title}</h2><p className="text-[11px] text-slate-500">Incoming and outgoing messages stay with the work</p></div></div><Link href="/admin/communications?channel=email" className="text-xs font-bold text-[#0066cc]">Open inbox</Link></header>{emails.length ? <div className="divide-y divide-slate-100">{emails.map((email) => { const outgoing = email.direction === "outgoing"; const state = emailState(email); return <article key={email.id} className="px-4 py-3"><div className="flex items-start gap-3"><span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${outgoing ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{outgoing ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="truncate text-sm font-bold">{email.subject || "Email message"}</h3><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${state.tone}`}>{state.label}</span><time className="text-[10px] text-slate-400">{new Date(email.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</time></div></div><p className="mt-0.5 truncate text-xs text-slate-500">{outgoing ? "To" : "From"}: {email.counterparty_email || "Unknown address"}</p>{email.body ? <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{email.body}</p> : null}</div></div></article> })}</div> : <p className="px-4 py-5 text-sm text-slate-500">No linked email yet. Replies with the request reference will appear here automatically.</p>}</section>
}

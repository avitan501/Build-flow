"use client"

import { MessageSquareText, Send, X } from "lucide-react"
import { useMemo, useState, useTransition } from "react"

import { sendAuraMessageAction } from "@/app/owner/aura/actions"

const updates = {
  received: "We received your material list and are reviewing it now. Is there anything else you would like to add?",
  question: "We are reviewing your material list and need one detail before we can price it.",
  pricing: "We are comparing supplier pricing for your material request now.",
} as const

export function RequestClientContact({ clientName, phone, requestTitle }: { clientName: string; phone: string; requestTitle: string }) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<keyof typeof updates>("received")
  const [note, setNote] = useState("")
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const firstName = clientName.trim().split(/\s+/)[0] || "there"
  const message = useMemo(() => [`Hi ${firstName},`, "", updates[preset], ...(note.trim() ? [note.trim()] : []), "", `Request: ${requestTitle}`, "", "Avantia Build"].join("\n"), [firstName, note, preset, requestTitle])

  function send() {
    startTransition(async () => {
      const result = await sendAuraMessageAction({ channel: "sms", recipient: phone, message })
      setFeedback(result.ok ? "Text sent." : result.error)
      if (result.ok) setNote("")
    })
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} disabled={!phone} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-40"><MessageSquareText className="h-4 w-4" />Contact client</button>
      {open ? <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="flex items-center justify-between"><strong className="text-sm">Message client</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close contact client"><X className="h-4 w-4" /></button></div><select value={preset} onChange={(event) => setPreset(event.target.value as keyof typeof updates)} className="mt-3 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="received">Request received</option><option value="question">Need one detail</option><option value="pricing">Pricing in progress</option></select><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Optional note" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{message}</pre><button type="button" onClick={send} disabled={pending || !phone} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{pending ? "Sending…" : "Send text"}</button>{feedback ? <p role="status" className="mt-2 text-xs font-bold text-slate-600">{feedback}</p> : null}</div> : null}
    </div>
  )
}

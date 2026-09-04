"use client"

import { Check, Pencil, X } from "lucide-react"
import { useState, useTransition } from "react"

import { updateMaterialRequestClientNameAction, updateMaterialRequestTitleAction } from "@/app/owner/materials/requests/actions"

export function RequestInlineNameEditor({ requestId, value, kind }: { requestId: string; value: string; kind: "request" | "client" }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const requestName = kind === "request"

  function cancel() {
    if (pending) return
    setDraft(value)
    setError("")
    setEditing(false)
  }

  function save() {
    const next = draft.trim()
    if (next.length < 2) { setError(requestName ? "Enter a request name." : "Enter the client name."); return }
    setError("")
    startTransition(async () => {
      const result = requestName
        ? await updateMaterialRequestTitleAction({ requestId, title: next })
        : await updateMaterialRequestClientNameAction({ requestId, clientName: next })
      if (!result.ok) { setError(result.error); return }
      setEditing(false)
      window.location.reload()
    })
  }

  if (!editing) return <button type="button" onClick={() => setEditing(true)} title={`Edit ${requestName ? "request" : "client"} name`} className={`group inline-flex max-w-full items-center gap-1.5 rounded-md text-left outline-none hover:text-[#0066cc] focus-visible:ring-2 focus-visible:ring-[#0071e3] ${requestName ? "text-xl font-bold sm:text-2xl" : "font-bold text-slate-950"}`}><span className="truncate">{value}</span><Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" /></button>

  return <div className="grid min-w-0 gap-1">
    <div className="flex min-w-0 items-center gap-1">
      <input autoFocus value={draft} maxLength={requestName ? 300 : 160} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") cancel() }} aria-label={requestName ? "Request name" : "Client name"} className={`min-w-0 flex-1 rounded-md border border-sky-300 bg-white px-2 outline-none focus:ring-2 focus:ring-sky-200 ${requestName ? "h-10 text-lg font-bold" : "h-9 text-sm font-bold"}`} />
      <button type="button" onClick={save} disabled={pending} aria-label="Save name" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0071e3] text-white disabled:opacity-50"><Check className="h-4 w-4" /></button>
      <button type="button" onClick={cancel} disabled={pending} aria-label="Cancel editing name" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white"><X className="h-4 w-4" /></button>
    </div>
    {error ? <span className="text-[10px] font-bold text-rose-700" role="alert">{error}</span> : null}
    {!requestName ? <span className="text-[9px] text-slate-400">Updates this client everywhere.</span> : null}
  </div>
}

"use client"

import { Check, Pencil, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { saveOriginalMaterialItemAction } from "@/app/owner/materials/requests/actions"
import { cleanMaterialRequestDetails, materialQuantity, materialSalesUnit, type ReviewableMaterialItem } from "@/lib/client-material-review"

export function OriginalRequestItemEditor({ requestId, item, mode = "edit" }: { requestId: string; item?: ReviewableMaterialItem; mode?: "edit" | "add" }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(item?.name ?? "")
  const [quantity, setQuantity] = useState(String(item ? materialQuantity(item) : 1))
  const [unit, setUnit] = useState(item ? materialSalesUnit(item) : "each")
  const [details, setDetails] = useState(item ? cleanMaterialRequestDetails(item.metadata?.request_details) : "")
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function save() {
    setFeedback("")
    startTransition(async () => {
      const result = await saveOriginalMaterialItemAction({ requestId, itemId: item?.id, name, quantity: Number(quantity), unit, details })
      if (!result.ok) { setFeedback(result.error); return }
      setFeedback(mode === "add" ? "Item added." : "Saved.")
      if (mode === "add") { setName(""); setQuantity("1"); setUnit("each"); setDetails("") }
      setOpen(false)
      router.refresh()
    })
  }

  return <div className="inline-flex">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-2 text-[10px] font-bold normal-case tracking-normal ${mode === "add" ? "border-sky-200 bg-sky-50 text-[#0066cc]" : "border-slate-200 bg-white text-slate-600"}`}>{mode === "add" ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{mode === "add" ? "Add item" : "Edit"}</button>
    {open ? <div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/45 p-3" role="dialog" aria-modal="true" aria-label={mode === "add" ? "Add original request item" : "Edit original request item"} onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false) }}><section className="w-full max-w-md rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Original request</p><h3 className="text-base font-bold">{mode === "add" ? "Add item" : "Edit item"}</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header><div className="grid gap-3 p-4 sm:grid-cols-[6rem_7rem_minmax(0,1fr)]"><label className="grid gap-1 text-xs font-bold">Quantity<input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-10 rounded-md border border-slate-300 px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Unit<input value={unit} onChange={(event) => setUnit(event.target.value)} className="h-10 rounded-md border border-slate-300 px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold sm:col-span-1">Item<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-md border border-slate-300 px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold sm:col-span-3">Details<textarea rows={3} value={details} onChange={(event) => setDetails(event.target.value)} className="rounded-md border border-slate-300 p-2 font-normal" /></label>{feedback ? <p className="text-xs font-bold text-rose-700 sm:col-span-3">{feedback}</p> : null}</div><footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3"><button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold">Cancel</button><button type="button" onClick={save} disabled={pending || !name.trim() || !unit.trim() || !(Number(quantity) > 0)} className="inline-flex h-10 items-center gap-1 rounded-md bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />{pending ? "Saving…" : "Save"}</button></footer></section></div> : null}
  </div>
}

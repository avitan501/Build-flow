"use client"

import { Check, Pencil, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"

import { saveOriginalMaterialItemAction, updateOrganizedMaterialItemAction } from "@/app/owner/materials/requests/actions"
import { AutosaveStatus } from "@/components/buildflow/autosave-status"
import { cleanMaterialRequestDetails, materialQuantity, materialSalesUnit, type ReviewableMaterialItem } from "@/lib/client-material-review"
import { useSequencedAutosave } from "@/lib/use-sequenced-autosave"

type ItemDraft = { name: string; quantity: string; unit: string; details: string }

function metadataText(item: ReviewableMaterialItem | undefined, key: string) {
  return typeof item?.metadata?.[key] === "string" ? String(item.metadata[key]) : ""
}

export function OriginalRequestItemEditor({ requestId, item, mode = "edit", itemKind = "original", trigger = "button", children }: { requestId: string; item?: ReviewableMaterialItem; mode?: "edit" | "add"; itemKind?: "original" | "organized"; trigger?: "button" | "content"; children?: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ItemDraft>(() => ({ name: item?.name ?? "", quantity: String(item ? materialQuantity(item) : 1), unit: item ? materialSalesUnit(item) : "each", details: item ? cleanMaterialRequestDetails(item.metadata?.request_details) : "" }))
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  async function persist(value: ItemDraft, version = 0) {
    if (mode === "add" || itemKind === "original") return saveOriginalMaterialItemAction({ requestId, itemId: item?.id, name: value.name, quantity: Number(value.quantity), unit: value.unit, details: value.details, version })
    const formData = new FormData()
    formData.set("requestId", requestId)
    formData.set("itemId", item?.id || "")
    formData.set("name", value.name)
    formData.set("quantity", value.quantity)
    formData.set("unit", value.unit)
    formData.set("dimensions", metadataText(item, "dimensions"))
    formData.set("thickness", metadataText(item, "thickness"))
    formData.set("productType", metadataText(item, "product_type"))
    formData.set("screwLength", metadataText(item, "screw_length"))
    formData.set("details", value.details)
    formData.set("markReady", String(item?.metadata?.review_status === "ready"))
    const result = await updateOrganizedMaterialItemAction(formData)
    return { ...result, version }
  }

  const autosave = useSequencedAutosave<ItemDraft>({
    save: persist,
    onSaved: () => router.refresh(),
  })

  function valid(value: ItemDraft) {
    return Boolean(value.name.trim() && value.unit.trim() && Number(value.quantity) > 0)
  }

  function updateDraft(patch: Partial<ItemDraft>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (mode === "edit" && valid(next)) autosave.queue(next)
    else if (mode === "edit") autosave.cancelPending()
  }

  function save() {
    setFeedback("")
    startTransition(async () => {
      const result = await persist(draft)
      if (!result.ok) { setFeedback(result.error); return }
      setFeedback(mode === "add" ? "Item added." : "Saved.")
      if (mode === "add") setDraft({ name: "", quantity: "1", unit: "each", details: "" })
      setOpen(false)
      router.refresh()
    })
  }

  return <div className={trigger === "content" ? "block w-full" : "inline-flex"}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} title={trigger === "content" ? "Click to edit item and quantity" : undefined} className={trigger === "content" ? "group relative block w-full rounded-md text-left outline-none transition hover:bg-sky-50/70 focus-visible:ring-2 focus-visible:ring-[#0071e3]" : `inline-flex min-h-9 items-center gap-1 rounded-md border px-2 text-[10px] font-bold normal-case tracking-normal ${mode === "add" ? "border-sky-200 bg-sky-50 text-[#0066cc]" : "border-slate-200 bg-white text-slate-600"}`}>{trigger === "content" ? <>{children}<span className="pointer-events-none absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#0066cc] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100"><Pencil className="h-3 w-3" /></span></> : <>{mode === "add" ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{mode === "add" ? "Add item" : "Edit"}</>}</button>
    {open ? <div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/45 p-3" role="dialog" aria-modal="true" aria-label={mode === "add" ? "Add original request item" : "Edit request item"} onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false) }}><section className="w-full max-w-md rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#0066cc]">{itemKind === "organized" ? "AI organized" : "Original request"}</p><h3 className="text-base font-bold">{mode === "add" ? "Add item" : "Edit item"}</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button></header><div className="grid gap-3 p-4 sm:grid-cols-[6rem_7rem_minmax(0,1fr)]"><label className="grid gap-1 text-xs font-bold">Quantity<input type="number" min="0.01" step="0.01" value={draft.quantity} onChange={(event) => updateDraft({ quantity: event.target.value })} className="h-10 rounded-md border border-slate-300 px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Unit<input value={draft.unit} onChange={(event) => updateDraft({ unit: event.target.value })} className="h-10 rounded-md border border-slate-300 px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold sm:col-span-1">Item<input autoFocus value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className="h-10 rounded-md border border-slate-300 px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold sm:col-span-3">Details<textarea rows={3} value={draft.details} onChange={(event) => updateDraft({ details: event.target.value })} className="rounded-md border border-slate-300 p-2 font-normal" /></label>{feedback ? <p className="text-xs font-bold text-rose-700 sm:col-span-3">{feedback}</p> : null}</div><footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-3">{mode === "edit" ? <AutosaveStatus status={autosave.status} error={autosave.error} retry={autosave.retry} /> : <span /> }<div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold">{mode === "add" ? "Cancel" : "Close"}</button>{mode === "add" ? <button type="button" onClick={save} disabled={pending || !valid(draft)} className="inline-flex h-10 items-center gap-1 rounded-md bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />{pending ? "Adding…" : "Add item"}</button> : null}</div></footer></section></div> : null}
  </div>
}

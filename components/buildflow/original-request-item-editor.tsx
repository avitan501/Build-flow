"use client"

import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { useState, useTransition, type ReactNode } from "react"

import { saveOriginalMaterialItemAction, updateOrganizedMaterialItemAction } from "@/app/owner/materials/requests/actions"
import { cleanMaterialRequestDetails, materialQuantity, materialSalesUnit, type ReviewableMaterialItem } from "@/lib/client-material-review"
import { COMMON_REQUEST_ITEM_FIELDS, requestItemFieldDefinition, requestItemFieldsFromMetadata, type RequestItemField } from "@/lib/request-item-fields"

type ItemDraft = { name: string; quantity: string; unit: string; details: string; fields: RequestItemField[] }
const COMMON_UNITS = ["each", "box", "bundle", "sheet", "piece", "roll", "bag", "pallet", "linear ft.", "sq. ft.", "cu. yd."]

function draftFromItem(item?: ReviewableMaterialItem): ItemDraft {
  return {
    name: item?.name ?? "",
    quantity: String(item ? materialQuantity(item) : 1),
    unit: item ? materialSalesUnit(item) : "each",
    details: item ? cleanMaterialRequestDetails(item.metadata?.request_details) : "",
    fields: requestItemFieldsFromMetadata(item?.metadata),
  }
}

function nextCustomId(fields: RequestItemField[]) {
  const used = new Set(fields.map((field) => field.id))
  let number = 1
  while (used.has(`custom-${number}`)) number += 1
  return `custom-${number}`
}

export function OriginalRequestItemEditor({ requestId, item, mode = "edit", itemKind = "original", trigger = "button", children }: { requestId: string; item?: ReviewableMaterialItem; mode?: "edit" | "add"; itemKind?: "original" | "organized"; trigger?: "button" | "content"; children?: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ItemDraft>(() => draftFromItem(item))
  const [fieldToAdd, setFieldToAdd] = useState("")
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()

  function openEditor() {
    setDraft(draftFromItem(item))
    setFeedback("")
    setFieldToAdd("")
    setOpen(true)
  }

  function closeEditor() {
    if (!pending) setOpen(false)
  }

  async function persist(value: ItemDraft) {
    if (mode === "add" || itemKind === "original") {
      return saveOriginalMaterialItemAction({ requestId, itemId: item?.id, name: value.name, quantity: Number(value.quantity), unit: value.unit, details: value.details, fields: value.fields })
    }
    const formData = new FormData()
    formData.set("requestId", requestId)
    formData.set("itemId", item?.id || "")
    formData.set("name", value.name)
    formData.set("quantity", value.quantity)
    formData.set("unit", value.unit)
    formData.set("details", value.details)
    formData.set("requestItemFields", JSON.stringify(value.fields))
    formData.set("markReady", String(item?.metadata?.review_status === "ready"))
    return updateOrganizedMaterialItemAction(formData)
  }

  function valid(value: ItemDraft) {
    return Boolean(value.name.trim() && value.unit.trim() && Number(value.quantity) > 0 && value.fields.every((field) => field.label.trim() && field.value.trim()))
  }

  function addField() {
    if (!fieldToAdd || draft.fields.length >= 12) return
    if (fieldToAdd === "custom") {
      setDraft((current) => ({ ...current, fields: [...current.fields, { id: nextCustomId(current.fields), label: "", value: "" }] }))
    } else {
      const definition = requestItemFieldDefinition(fieldToAdd)
      if (definition && !draft.fields.some((field) => field.id === definition.id)) setDraft((current) => ({ ...current, fields: [...current.fields, { id: definition.id, label: definition.label, value: "" }] }))
    }
    setFieldToAdd("")
  }

  function updateField(id: string, patch: Partial<RequestItemField>) {
    setDraft((current) => ({ ...current, fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field) }))
  }

  function removeField(id: string) {
    setDraft((current) => ({ ...current, fields: current.fields.filter((field) => field.id !== id) }))
  }

  function save() {
    if (!valid(draft)) return
    setFeedback("")
    startTransition(async () => {
      try {
        const result = await persist(draft)
        if (!result.ok) { setFeedback(result.error); return }
        if (mode === "add") setDraft(draftFromItem())
        setOpen(false)
        router.refresh()
      } catch {
        setFeedback("The item was not saved. Check the connection and try again.")
      }
    })
  }

  const usedCommonIds = new Set(draft.fields.map((field) => field.id))
  const availableFields = COMMON_REQUEST_ITEM_FIELDS.filter((field) => !usedCommonIds.has(field.id))
  const dialog = open && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={mode === "add" ? "Add request item" : "Edit request item"} onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor() }}>
      <section className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#0066cc]">{itemKind === "organized" ? "AI organized" : "Original request"}</p><h3 className="text-base font-bold">{mode === "add" ? "Add item" : "Edit item"}</h3></div>
          <button type="button" onClick={closeEditor} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 sm:h-9 sm:w-9"><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-[6rem_8rem_minmax(0,1fr)]">
            <label className="grid gap-1 text-xs font-bold">Quantity<input type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" /></label>
            <label className="grid gap-1 text-xs font-bold">Unit<input list="request-item-units" value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" /><datalist id="request-item-units">{COMMON_UNITS.map((unit) => <option key={unit} value={unit} />)}</datalist></label>
            <label className="grid gap-1 text-xs font-bold">Item<input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" /></label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-bold">Item details</p><p className="text-[10px] text-slate-500">Choose a common field or create your own.</p></div><span className="text-[10px] font-semibold text-slate-400">{draft.fields.length}/12</span></div>
            {draft.fields.length ? <div className="grid gap-2">{draft.fields.map((field) => {
              const definition = requestItemFieldDefinition(field.id)
              const listId = definition ? `request-item-options-${definition.id}` : undefined
              return <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_2.2rem] gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[9rem_minmax(0,1fr)_2.2rem]">
                {definition ? <span className="flex min-h-11 items-center px-1 text-xs font-bold text-slate-700">{definition.label}</span> : <input aria-label="Custom field name" placeholder="Field name" value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} className="h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold" />}
                <input aria-label={`${field.label || "Custom"} value`} list={listId} placeholder={definition ? `Choose or type ${definition.label.toLowerCase()}` : "Type value"} value={field.value} onChange={(event) => updateField(field.id, { value: event.target.value })} className="col-start-1 h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:col-start-2" />
                {definition ? <datalist id={listId}>{definition.suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist> : null}
                <button type="button" onClick={() => removeField(field.id)} aria-label={`Remove ${field.label || "custom field"}`} className="col-start-2 row-start-1 inline-flex h-11 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 sm:col-start-3"><Trash2 className="h-4 w-4" /></button>
              </div>
            })}</div> : <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">No extra details yet.</p>}
            {draft.fields.length < 12 ? <div className="mt-3 flex gap-2"><select aria-label="Add item detail" value={fieldToAdd} onChange={(event) => setFieldToAdd(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"><option value="">Add detail…</option>{availableFields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}<option value="custom">New custom field</option></select><button type="button" onClick={addField} disabled={!fieldToAdd} className="inline-flex h-11 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-[#0066cc] disabled:opacity-40"><Plus className="h-4 w-4" />Add</button></div> : null}
          </div>

          <label className="mt-5 grid gap-1 border-t border-slate-100 pt-4 text-xs font-bold">General notes<textarea rows={3} value={draft.details} onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))} placeholder="Anything else the supplier should know" className="resize-y rounded-lg border border-slate-300 p-3 font-normal" /></label>
          {feedback ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{feedback}</p> : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={closeEditor} disabled={pending} className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold">Cancel</button>
          <button type="button" onClick={save} disabled={pending || !valid(draft)} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-40"><Check className="h-4 w-4" />{pending ? "Saving…" : mode === "add" ? "Add item" : "Save changes"}</button>
        </footer>
      </section>
    </div>, document.body) : null

  return <div className={trigger === "content" ? "block w-full" : "inline-flex"}>
    <button type="button" onClick={openEditor} aria-expanded={open} title={trigger === "content" ? "Click to edit item, quantity, and details" : undefined} className={trigger === "content" ? "group relative block min-h-11 w-full rounded-md text-left outline-none transition hover:bg-sky-50/70 focus-visible:ring-2 focus-visible:ring-[#0071e3] sm:min-h-0" : `inline-flex min-h-11 items-center gap-1 rounded-md border px-2 text-[10px] font-bold normal-case tracking-normal sm:min-h-9 ${mode === "add" ? "border-sky-200 bg-sky-50 text-[#0066cc]" : "border-slate-200 bg-white text-slate-600"}`}>{trigger === "content" ? <>{children}<span className="pointer-events-none absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#0066cc] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100"><Pencil className="h-3 w-3" /></span></> : <>{mode === "add" ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{mode === "add" ? "Add item" : "Edit"}</>}</button>
    {dialog}
  </div>
}

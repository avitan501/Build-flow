"use client"

import { Check, Plus, Route, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"

export type RequestRouteSupplier = { id: string; name: string }

function savedNames(metadata: Record<string, unknown> | null | undefined) {
  return Array.isArray(metadata?.supplier_route_names) ? metadata.supplier_route_names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())) : []
}

function savedNotes(metadata: Record<string, unknown> | null | undefined) {
  const raw = metadata?.supplier_route_notes
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {} as Record<string, string>
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
}

export function RequestSupplierRouteEditor({ requestId, itemId, itemIds, metadata, suppliers, applyToAll = false }: {
  requestId: string
  itemId?: string
  itemIds?: string[]
  metadata?: Record<string, unknown> | null
  suppliers: RequestRouteSupplier[]
  applyToAll?: boolean
}) {
  const router = useRouter()
  const [names, setNames] = useState<string[]>(() => savedNames(metadata))
  const [notes, setNotes] = useState<Record<string, string>>(() => savedNotes(metadata))
  const [manualName, setManualName] = useState("")
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const targetIds = useMemo(() => [...new Set((itemIds?.length ? itemIds : itemId ? [itemId] : []).filter(Boolean))], [itemId, itemIds])

  function addSupplier(name: string) {
    const cleanName = name.trim().replace(/\s+/g, " ")
    if (!cleanName || names.some((entry) => entry.toLowerCase() === cleanName.toLowerCase())) return
    setNames((current) => [...current, cleanName])
    setManualName("")
  }

  function removeSupplier(name: string) {
    setNames((current) => current.filter((entry) => entry !== name))
    setNotes((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)))
  }

  function save() {
    setFeedback("")
    startTransition(async () => {
      const result = await saveRequestItemSupplierRouteAction({ requestId, itemIds: targetIds, supplierNames: names, supplierNotes: notes })
      if (!result.ok) { setFeedback(result.error); return }
      setFeedback(applyToAll ? "Saved for every item" : "Saved")
      setOpen(false)
      router.refresh()
    })
  }

  const label = applyToAll ? "Set one route for all items" : names.length ? names.join(" · ") : "Choose supplier route"

  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} className={`flex min-h-9 w-full items-center gap-1.5 rounded-md border px-2 text-left text-[10px] font-bold ${applyToAll ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-700"}`}><Route className="h-3.5 w-3.5 shrink-0 text-[#0066cc]" /><span className="line-clamp-2">{label}</span></button>
    {open ? <div className="mt-2 grid gap-2 rounded-md border border-sky-200 bg-sky-50 p-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"><select aria-label="Choose supplier" defaultValue="" onChange={(event) => { addSupplier(event.target.value); event.currentTarget.value = "" }} className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold"><option value="">Choose from Supplier Directory…</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)}</select><span className="inline-flex h-9 items-center rounded-md bg-white px-2 text-[10px] font-bold text-slate-500">{names.length} selected</span></div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"><input value={manualName} onChange={(event) => setManualName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSupplier(manualName) } }} placeholder="Type another supplier" className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-[11px]" /><button type="button" onClick={() => addSupplier(manualName)} disabled={!manualName.trim()} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[10px] font-bold disabled:opacity-40"><Plus className="h-3 w-3" />Add</button></div>
      {names.length ? <div className="grid max-h-64 gap-1.5 overflow-y-auto">{names.map((name) => <div key={name} className="grid grid-cols-[minmax(7rem,.7fr)_minmax(9rem,1fr)_2rem] items-center gap-1 rounded-md border border-slate-200 bg-white p-1"><span title={name} className="truncate px-1 text-[10px] font-bold text-slate-800">{name}</span><input value={notes[name] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [name]: event.target.value }))} maxLength={800} placeholder="Note for this supplier" className="h-8 min-w-0 rounded border border-slate-200 px-2 text-[10px]" /><button type="button" onClick={() => removeSupplier(name)} aria-label={`Remove ${name}`} className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button></div>)}</div> : <p className="text-[10px] text-slate-500">Add as many suppliers as needed.</p>}
      <button type="button" onClick={save} disabled={pending || !targetIds.length} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-[#0071e3] px-3 text-[11px] font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{pending ? "Saving…" : applyToAll ? "Apply to all items" : "Save route"}</button>
      {feedback ? <p className={`text-[10px] font-bold ${feedback.startsWith("Saved") ? "text-emerald-700" : "text-rose-700"}`}>{feedback}</p> : null}
    </div> : null}
    {!open && names.some((name) => notes[name]?.trim()) ? <div className="mt-1 grid gap-0.5">{names.filter((name) => notes[name]?.trim()).map((name) => <p key={name} title={notes[name]} className="line-clamp-1 cursor-help text-[9px] leading-4 text-slate-500"><strong>{name}:</strong> {notes[name]}</p>)}</div> : null}
  </div>
}

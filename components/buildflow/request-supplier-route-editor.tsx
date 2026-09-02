"use client"

import { Plus, Route, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"
import { AutosaveStatus } from "@/components/buildflow/autosave-status"
import { canonicalSupplierKey, resolveRequestSupplierRouteSelections } from "@/lib/supplier-canonical"
import { useSequencedAutosave } from "@/lib/use-sequenced-autosave"

export type RequestRouteSupplier = { id: string; name: string }

const supplierNameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

function orderedNames(names: string[]) {
  return [...names].sort((left, right) => supplierNameCollator.compare(left, right))
}

export function RequestSupplierRouteEditor({ requestId, itemId, itemIds, metadata, suppliers }: {
  requestId: string
  itemId?: string
  itemIds?: string[]
  metadata?: Record<string, unknown> | null
  suppliers: RequestRouteSupplier[]
}) {
  const router = useRouter()
  const initialSelections = resolveRequestSupplierRouteSelections([{ metadata }], suppliers)
  const [names, setNames] = useState<string[]>(() => orderedNames(initialSelections.map((selection) => selection.name)))
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialSelections.filter((selection) => selection.note).map((selection) => [selection.name, selection.note])))
  const [manualName, setManualName] = useState("")
  const [supplierQuery, setSupplierQuery] = useState("")
  const [scope, setScope] = useState<"item" | "all">("item")
  const [open, setOpen] = useState(false)
  const allTargetIds = useMemo(() => [...new Set((itemIds?.length ? itemIds : itemId ? [itemId] : []).filter(Boolean))], [itemId, itemIds])
  const itemTargetIds = useMemo(() => itemId ? [itemId] : allTargetIds, [allTargetIds, itemId])
  const canApplyToAll = allTargetIds.length > 1
  const targetIds = scope === "all" && canApplyToAll ? allTargetIds : itemTargetIds
  const orderedSuppliers = useMemo(() => [...suppliers].sort((left, right) => supplierNameCollator.compare(left.name, right.name)), [suppliers])
  const visibleSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLocaleLowerCase()
    return query ? orderedSuppliers.filter((supplier) => supplier.name.toLocaleLowerCase().includes(query)) : orderedSuppliers
  }, [orderedSuppliers, supplierQuery])
  const autosave = useSequencedAutosave<{ itemIds: string[]; supplierNames: string[]; supplierNotes: Record<string, string> }>({
    save: (draft, version) => saveRequestItemSupplierRouteAction({ requestId, ...draft, version }),
    onSaved: () => router.refresh(),
  })

  function queueRoute(nextNames: string[], nextNotes: Record<string, string>) {
    setNames(nextNames)
    setNotes(nextNotes)
    autosave.queue({ itemIds: targetIds, supplierNames: nextNames, supplierNotes: nextNotes })
  }

  function addSupplier(name: string) {
    const cleanName = name.trim().replace(/\s+/g, " ")
    const key = canonicalSupplierKey(cleanName)
    if (!cleanName || !key || names.some((entry) => canonicalSupplierKey(entry) === key)) return
    queueRoute(orderedNames([...names, cleanName]), notes)
    setManualName("")
  }

  function removeSupplier(name: string) {
    queueRoute(names.filter((entry) => entry !== name), Object.fromEntries(Object.entries(notes).filter(([key]) => key !== name)))
  }

  const label = names.length ? orderedNames(names).join(" · ") : "Choose supplier route"

  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-h-9 w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-left text-[10px] font-bold text-slate-700"><Route className="h-3.5 w-3.5 shrink-0 text-[#0066cc]" /><span className="line-clamp-2">{label}</span></button>
    {open ? <div className="mt-2 grid gap-2 rounded-md border border-sky-200 bg-sky-50 p-2">
      {canApplyToAll ? <fieldset className="grid grid-cols-2 overflow-hidden rounded-md border border-sky-200 bg-white p-0.5" aria-label="Apply supplier route to"><label className={`flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded px-2 text-[10px] font-bold ${scope === "item" ? "bg-slate-900 text-white" : "text-slate-600"}`}><input type="radio" name={`supplier-route-scope-${itemId}`} value="item" checked={scope === "item"} onChange={() => setScope("item")} className="sr-only" />Only this item</label><label className={`flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded px-2 text-[10px] font-bold ${scope === "all" ? "bg-slate-900 text-white" : "text-slate-600"}`}><input type="radio" name={`supplier-route-scope-${itemId}`} value="all" checked={scope === "all"} onChange={() => setScope("all")} className="sr-only" />All items in request</label></fieldset> : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"><input value={supplierQuery} onChange={(event) => setSupplierQuery(event.target.value)} placeholder="Find supplier A–Z" aria-label="Find supplier" className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold" /><span className="inline-flex h-9 items-center rounded-md bg-white px-2 text-[10px] font-bold text-slate-500">{names.length} selected</span></div>
      <fieldset className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white" aria-label="Choose suppliers"><legend className="sr-only">Choose suppliers in alphabetical order</legend>{visibleSuppliers.length ? visibleSuppliers.map((supplier) => { const supplierKey = canonicalSupplierKey(supplier.name); const checked = names.some((name) => canonicalSupplierKey(name) === supplierKey); return <label key={supplier.id} className={`flex min-h-9 cursor-pointer items-center gap-2 border-b border-slate-100 px-2 text-[10px] font-semibold last:border-b-0 ${checked ? "bg-sky-50 text-sky-900" : "text-slate-700 hover:bg-slate-50"}`}><input type="checkbox" checked={checked} onChange={(event) => event.target.checked ? addSupplier(supplier.name) : removeSupplier(names.find((name) => canonicalSupplierKey(name) === supplierKey) ?? supplier.name)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /><span className="truncate">{supplier.name}</span></label> }) : <p className="px-2 py-3 text-[10px] text-slate-500">No supplier found.</p>}</fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"><input value={manualName} onChange={(event) => setManualName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSupplier(manualName) } }} placeholder="Type another supplier" className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-[11px]" /><button type="button" onClick={() => addSupplier(manualName)} disabled={!manualName.trim()} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[10px] font-bold disabled:opacity-40"><Plus className="h-3 w-3" />Add</button></div>
      {names.length ? <div className="grid max-h-64 gap-1.5 overflow-y-auto">{orderedNames(names).map((name) => <div key={name} className="grid grid-cols-[minmax(7rem,.7fr)_minmax(9rem,1fr)_2rem] items-center gap-1 rounded-md border border-slate-200 bg-white p-1"><span title={name} className="truncate px-1 text-[10px] font-bold text-slate-800">{name}</span><input value={notes[name] ?? ""} onChange={(event) => { const nextNotes = { ...notes, [name]: event.target.value }; queueRoute(names, nextNotes) }} maxLength={800} placeholder="Note for this supplier" className="h-8 min-w-0 rounded border border-slate-200 px-2 text-[10px]" /><button type="button" onClick={() => removeSupplier(name)} aria-label={`Remove ${name}`} className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button></div>)}</div> : <p className="text-[10px] text-slate-500">Choose any suppliers needed.</p>}
      {scope === "all" && canApplyToAll ? <p className="rounded bg-amber-50 px-2 py-1.5 text-[9px] font-semibold text-amber-800">This replaces the supplier route on every item in this request.</p> : null}
      <AutosaveStatus status={autosave.status} error={autosave.error} retry={autosave.retry} />
    </div> : null}
    {!open && names.some((name) => notes[name]?.trim()) ? <div className="mt-1 grid gap-0.5">{names.filter((name) => notes[name]?.trim()).map((name) => <p key={name} title={notes[name]} className="line-clamp-1 cursor-help text-[9px] leading-4 text-slate-500"><strong>{name}:</strong> {notes[name]}</p>)}</div> : null}
  </div>
}

"use client"

import { Plus, Route, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"
import { AutosaveStatus } from "@/components/buildflow/autosave-status"
import { canonicalSupplierKey, resolveRequestSupplierRouteSelections } from "@/lib/supplier-canonical"
import { useSequencedAutosave } from "@/lib/use-sequenced-autosave"
import { hasSupplierRouteOverride, supplierGroupRouteDefault, supplierRouteRevision, type SupplierRouteMode } from "@/lib/request-supplier-group-route"

export type RequestRouteSupplier = { id: string; name: string }

const supplierNameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

function orderedNames(names: string[]) {
  return [...names].sort((left, right) => supplierNameCollator.compare(left, right))
}

export function RequestSupplierRouteEditor({ requestId, itemId, itemIds, metadata, suppliers, mode = "item", groupKey, groupMetadata, itemRouteVersions, onDirtyChange }: {
  requestId: string
  itemId?: string
  itemIds?: string[]
  metadata?: Record<string, unknown> | null
  suppliers: RequestRouteSupplier[]
  mode?: "item" | "group" | "batch"
  groupKey?: string
  groupMetadata?: Record<string, unknown> | null
  itemRouteVersions?: Record<string, number>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const router = useRouter()
  const normalizedGroupKey = groupKey?.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ")
  const groupDefault = supplierGroupRouteDefault(groupMetadata ?? metadata, normalizedGroupKey)
  const selectionMetadata = mode === "group" ? groupDefault ? { supplier_route_names: groupDefault.names, supplier_route_entries: groupDefault.entries, supplier_route_notes: groupDefault.notes } : null : mode === "batch" ? null : metadata
  const initialSelections = resolveRequestSupplierRouteSelections([{ metadata: selectionMetadata }], suppliers)
  const [names, setNames] = useState<string[]>(() => orderedNames(initialSelections.map((selection) => selection.name)))
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialSelections.filter((selection) => selection.note).map((selection) => [selection.name, selection.note])))
  const [manualName, setManualName] = useState("")
  const [supplierQuery, setSupplierQuery] = useState("")
  const [open, setOpen] = useState(false)
  const dirtyRef = useRef(false)
  const dirtyCallbackRef = useRef(onDirtyChange)
  const [navigationWarning, setNavigationWarning] = useState("")
  useEffect(() => { dirtyCallbackRef.current = onDirtyChange }, [onDirtyChange])
  const allTargetIds = useMemo(() => [...new Set((itemIds?.length ? itemIds : itemId ? [itemId] : []).filter(Boolean))], [itemId, itemIds])
  const targetIds = useMemo(() => mode === "item" && itemId ? [itemId] : allTargetIds, [allTargetIds, itemId, mode])
  const revisionsRef = useRef<Record<string, number>>({ ...itemRouteVersions, ...(itemId ? { [itemId]: itemRouteVersions?.[itemId] ?? supplierRouteRevision(metadata) } : {}) })
  const orderedSuppliers = useMemo(() => [...suppliers].sort((left, right) => supplierNameCollator.compare(left.name, right.name)), [suppliers])
  const visibleSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLocaleLowerCase()
    return query ? orderedSuppliers.filter((supplier) => supplier.name.toLocaleLowerCase().includes(query)) : orderedSuppliers
  }, [orderedSuppliers, supplierQuery])
  const autosave = useSequencedAutosave<{ itemIds: string[]; supplierNames: string[]; supplierNotes: Record<string, string>; mode: SupplierRouteMode }>({
    save: async (draft, version) => {
      const result = await saveRequestItemSupplierRouteAction({ requestId, ...draft, groupKey: normalizedGroupKey, expectedRouteRevisions: Object.fromEntries(draft.itemIds.filter((id) => revisionsRef.current[id] !== undefined).map((id) => [id, revisionsRef.current[id]])), version })
      if (result.ok) revisionsRef.current = { ...revisionsRef.current, ...result.routeRevisions }
      return result
    },
    onSaved: () => { dirtyRef.current = false; dirtyCallbackRef.current?.(false); setNavigationWarning(""); router.refresh() },
  })
  const incoming = JSON.stringify({ selections: initialSelections, versions: itemRouteVersions, revision: supplierRouteRevision(metadata), targets: targetIds })
  const lastIncomingRef = useRef(incoming)
  useEffect(() => {
    if (incoming === lastIncomingRef.current || autosave.status === "saving" || autosave.status === "error") return
    const next = JSON.parse(incoming) as { selections: Array<{ name: string; note?: string }>; versions?: Record<string, number>; revision: number }
    const incomingVersions = { ...next.versions, ...(itemId ? { [itemId]: next.versions?.[itemId] ?? next.revision } : {}) }
    if (Object.entries(incomingVersions).some(([id, revision]) => revision < (revisionsRef.current[id] ?? 0))) return
    lastIncomingRef.current = incoming
    revisionsRef.current = { ...revisionsRef.current, ...next.versions, ...(itemId ? { [itemId]: next.versions?.[itemId] ?? next.revision } : {}) }
    if (mode !== "batch") {
      queueMicrotask(() => {
        if (dirtyRef.current || lastIncomingRef.current !== incoming) return
        setNames(orderedNames(next.selections.map((selection) => selection.name)))
        setNotes(Object.fromEntries(next.selections.filter((selection) => selection.note).map((selection) => [selection.name, selection.note!])))
      })
    }
  }, [incoming, autosave.status, itemId, mode])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = "" } }
    const beforeLink = (event: MouseEvent) => {
      if (!dirtyRef.current || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download") || !/^https?:/.test(link.href)) return
      event.preventDefault(); event.stopPropagation(); setNavigationWarning("Wait for the route to save, or retry the error, before leaving.")
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", beforeLink, true)
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", beforeLink, true) }
  }, [])

  function queueRoute(nextNames: string[], nextNotes: Record<string, string>) {
    dirtyRef.current = true
    dirtyCallbackRef.current?.(true)
    setNames(nextNames)
    setNotes(nextNotes)
    autosave.queue({ itemIds: targetIds, supplierNames: nextNames, supplierNotes: nextNotes, mode })
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

  const label = names.length ? orderedNames(names).join(" · ") : mode === "group" ? "Choose group suppliers" : mode === "batch" ? "Set selected items’ suppliers" : "Choose supplier route"
  const inherited = metadata?.supplier_route_mode === "group" && metadata?.supplier_route_group_key === normalizedGroupKey
  const movedGroup = metadata?.supplier_route_mode === "group" && metadata?.supplier_route_group_key !== normalizedGroupKey

  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-h-9 w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-left text-[10px] font-bold text-slate-700"><Route className="h-3.5 w-3.5 shrink-0 text-[#0066cc]" /><span className="line-clamp-2">{label}</span></button>
    {open ? <div className="mt-2 grid gap-2 rounded-md border border-sky-200 bg-sky-50 p-2">
      <p className="text-[10px] font-semibold text-sky-900">{mode === "group" ? `Default for ${groupKey || "this group"} · individual exceptions stay unchanged.` : mode === "batch" ? `${targetIds.length} selected items · saves individual overrides only.` : movedGroup ? "Route from a previous group. Review or use this group's suppliers." : inherited ? "Using group suppliers. Editing creates an exception for this item." : "Only this item · other products stay unchanged."}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"><input value={supplierQuery} onChange={(event) => setSupplierQuery(event.target.value)} placeholder="Find supplier A–Z" aria-label="Find supplier" className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold" /><span className="inline-flex h-9 items-center rounded-md bg-white px-2 text-[10px] font-bold text-slate-500">{names.length} selected</span></div>
      <fieldset className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white" aria-label="Choose suppliers"><legend className="sr-only">Choose suppliers in alphabetical order</legend>{visibleSuppliers.length ? visibleSuppliers.map((supplier) => { const supplierKey = canonicalSupplierKey(supplier.name); const checked = names.some((name) => canonicalSupplierKey(name) === supplierKey); return <label key={supplier.id} className={`flex min-h-9 cursor-pointer items-center gap-2 border-b border-slate-100 px-2 text-[10px] font-semibold last:border-b-0 ${checked ? "bg-sky-50 text-sky-900" : "text-slate-700 hover:bg-slate-50"}`}><input type="checkbox" checked={checked} onChange={(event) => event.target.checked ? addSupplier(supplier.name) : removeSupplier(names.find((name) => canonicalSupplierKey(name) === supplierKey) ?? supplier.name)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" /><span className="truncate">{supplier.name}</span></label> }) : <p className="px-2 py-3 text-[10px] text-slate-500">No supplier found.</p>}</fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"><input value={manualName} onChange={(event) => setManualName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSupplier(manualName) } }} placeholder="Type another supplier" className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-[11px]" /><button type="button" onClick={() => addSupplier(manualName)} disabled={!manualName.trim()} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[10px] font-bold disabled:opacity-40"><Plus className="h-3 w-3" />Add</button></div>
      {names.length ? <div className="grid max-h-64 gap-1.5 overflow-y-auto">{orderedNames(names).map((name) => <div key={name} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-1 rounded-md border border-slate-200 bg-white p-1"><span title={name} className="break-words px-1 text-[10px] font-bold text-slate-800">{name}</span><button type="button" onClick={() => removeSupplier(name)} aria-label={`Remove ${name}`} className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button><input value={notes[name] ?? ""} onChange={(event) => { const nextNotes = { ...notes, [name]: event.target.value }; queueRoute(names, nextNotes) }} maxLength={800} placeholder="Note for this supplier" aria-label={`Note for ${name}`} className="col-span-2 h-9 min-w-0 rounded border border-slate-200 px-2 text-[10px]" /></div>)}</div> : <p className="text-[10px] text-slate-500">Choose any suppliers needed.</p>}
      {mode === "item" && groupDefault && (hasSupplierRouteOverride(metadata) || movedGroup) ? <button type="button" disabled={autosave.status === "saving"} onClick={() => { dirtyRef.current = true; dirtyCallbackRef.current?.(true); setNames(orderedNames(groupDefault.names)); setNotes(groupDefault.notes); autosave.queue({ itemIds: targetIds, supplierNames: [], supplierNotes: {}, mode: "reset" }) }} className="min-h-10 rounded border border-sky-300 bg-white px-3 text-left text-xs font-bold text-[#0066cc]">Use group suppliers again</button> : null}
      <p className="text-[9px] text-slate-500">Saves the route only. Nothing is sent.</p>
      <AutosaveStatus status={autosave.status} error={autosave.error} retry={autosave.retry} />
      {navigationWarning ? <p role="alert" className="text-xs font-semibold text-amber-800">{navigationWarning}</p> : null}
    </div> : null}
    {!open && names.some((name) => notes[name]?.trim()) ? <div className="mt-1 grid gap-0.5">{names.filter((name) => notes[name]?.trim()).map((name) => <p key={name} title={notes[name]} className="line-clamp-1 cursor-help text-[9px] leading-4 text-slate-500"><strong>{name}:</strong> {notes[name]}</p>)}</div> : null}
  </div>
}

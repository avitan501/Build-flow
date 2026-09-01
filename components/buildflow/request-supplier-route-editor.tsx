"use client"

import { Check, Route } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"

export type RequestRouteSupplier = { id: string; name: string }

function savedNames(metadata: Record<string, unknown> | null | undefined) {
  return Array.isArray(metadata?.supplier_route_names) ? metadata.supplier_route_names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())) : []
}

export function RequestSupplierRouteEditor({ requestId, itemId, metadata, suppliers }: { requestId: string; itemId: string; metadata?: Record<string, unknown> | null; suppliers: RequestRouteSupplier[] }) {
  const router = useRouter()
  const [names, setNames] = useState(savedNames(metadata).join(", "))
  const [note, setNote] = useState(typeof metadata?.supplier_route_note === "string" ? metadata.supplier_route_note : "")
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const parsedNames = names.split(",").map((name) => name.trim()).filter(Boolean)

  function addSupplier(name: string) {
    if (!name || parsedNames.some((entry) => entry.toLowerCase() === name.toLowerCase())) return
    setNames([...parsedNames, name].join(", "))
  }

  function save() {
    setFeedback("")
    startTransition(async () => {
      const result = await saveRequestItemSupplierRouteAction({ requestId, itemIds: [itemId], supplierNames: parsedNames, routeNote: note })
      if (!result.ok) { setFeedback(result.error); return }
      setFeedback("Saved")
      setOpen(false)
      router.refresh()
    })
  }

  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-9 w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-left text-[10px] font-bold text-slate-700"><Route className="h-3.5 w-3.5 shrink-0 text-[#0066cc]" /><span className="line-clamp-2">{parsedNames.length ? parsedNames.join(" · ") : "Choose supplier route"}</span></button>
    {open ? <div className="mt-2 grid gap-1.5 rounded-md border border-sky-200 bg-sky-50 p-2"><select aria-label="Choose supplier" defaultValue="" onChange={(event) => { addSupplier(event.target.value); event.currentTarget.value = "" }} className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold"><option value="">Choose from suppliers…</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.name}</option>)}</select><input value={names} onChange={(event) => setNames(event.target.value)} placeholder="Or type supplier names" className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-[11px]" /><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Route note (optional)" className="min-w-0 rounded-md border border-slate-300 p-2 text-[11px]" /><button type="button" onClick={save} disabled={pending} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-[#0071e3] px-3 text-[11px] font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{pending ? "Saving…" : "Save route"}</button>{feedback ? <p className="text-[10px] font-bold text-rose-700">{feedback}</p> : null}</div> : null}
    {!open && note ? <p title={note} className="mt-1 line-clamp-2 cursor-help text-[9px] leading-4 text-slate-500">{note}</p> : null}
  </div>
}

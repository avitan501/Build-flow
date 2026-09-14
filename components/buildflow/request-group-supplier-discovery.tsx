"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import type { SupplierDiscoveryCandidate } from "@/lib/supplier-discovery"
import { supplierIdentityKeys } from "@/lib/supplier-identity"
import { addDiscoveredSupplierNetworkAction } from "@/app/admin/supplier-network/actions"
import { saveRequestItemSupplierRouteAction } from "@/app/owner/materials/requests/actions"

export function RequestGroupSupplierDiscovery({ requestId, group, items, allItems, defaultZipCode }: { requestId: string; group: string; items: ReviewableMaterialItem[]; allItems: ReviewableMaterialItem[]; defaultZipCode: string }) {
  const router = useRouter()
  const [zip, setZip] = useState(defaultZipCode)
  const [results, setResults] = useState<SupplierDiscoveryCandidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [feedback, setFeedback] = useState("")
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const names = allItems.flatMap((item) => Array.isArray(item.metadata?.supplier_route_names) ? item.metadata.supplier_route_names.filter((name): name is string => typeof name === "string") : [])
  async function discover() {
    if (busy.current || !/^\d{5}$/.test(zip)) { setFeedback("Enter a 5-digit ZIP code."); return }
    busy.current = true; setPending(true); setResults([]); setSelected([]); setFeedback("")
    try {
      const response = await fetch("/api/admin/suppliers/discover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department: `${group}: ${items.map((item) => item.name).join(", ")}`.slice(0, 100), zipCode: zip, excludeIdentities: [...new Set(names.flatMap((name) => supplierIdentityKeys({ name })))], provider: "primary", limit: 5 }) })
      const payload = await response.json()
      if (!response.ok || !payload.ok) { setFeedback(payload.error || "Supplier search is unavailable. No fallback provider was used."); return }
      setResults(payload.suppliers || [])
      if (!payload.suppliers?.length) setFeedback("No new verified suppliers found.")
    } catch { setFeedback("Supplier search is unavailable. Try again.") }
    finally { busy.current = false; setPending(false) }
  }
  async function attach() {
    if (busy.current || !selected.length) return
    busy.current = true; setPending(true); setFeedback("")
    try {
      for (const supplier of results.filter((entry) => selected.includes(entry.name))) {
        const result = await addDiscoveredSupplierNetworkAction({ name: supplier.name, url: supplier.url, summary: supplier.summary, department: group.slice(0, 100), zipCode: zip, reviewConfirmed: true })
        if (!result.ok) { setFeedback(result.error); return }
      }
      const result = await saveRequestItemSupplierRouteAction({ requestId, itemIds: items.map((item) => item.id), supplierNames: selected, mode: "batch", expectedRouteRevisions: Object.fromEntries(items.map((item) => [item.id, Number(item.metadata?.supplier_route_revision || 0)])) })
      if (!result.ok) { setFeedback(result.error); return }
      setResults([]); setSelected([]); setFeedback("Suppliers saved. No messages sent."); router.refresh()
    } catch { setFeedback("Could not finish. Check the saved supplier route before trying again.") }
    finally { busy.current = false; setPending(false) }
  }
  return <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-[#0066cc]">Find 5 suppliers for this group</summary><div className="grid gap-2"><label className="text-xs">ZIP code<input aria-label={`Supplier ZIP for ${group}`} value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} disabled={pending} className="ml-2 min-h-11 w-24 rounded-lg border px-2" /></label><button type="button" onClick={discover} disabled={pending} className="min-h-11 rounded-lg border text-xs font-bold">{pending ? "Working…" : "Find suppliers"}</button>{results.map((supplier) => <label key={supplier.identity} className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" disabled={pending} checked={selected.includes(supplier.name)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, supplier.name] : current.filter((name) => name !== supplier.name))} /><span>{supplier.name}</span><a href={supplier.url} target="_blank" rel="noreferrer" className="text-[#0066cc]">Source</a></label>)}{results.length ? <button type="button" disabled={pending || !selected.length} onClick={attach} className="min-h-11 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white">Add selected suppliers</button> : null}<p role="status" className="text-xs text-slate-600">{feedback}</p></div></details>
}

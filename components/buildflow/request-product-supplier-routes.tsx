"use client"

import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import { RequestSupplierRouteEditor, type RequestRouteSupplier } from "@/components/buildflow/request-supplier-route-editor"
import { similarItemGroupLabel } from "@/components/buildflow/request-material-worktable"
import { RequestGroupSupplierDiscovery } from "@/components/buildflow/request-group-supplier-discovery"

/** The existing routing editor remains the only writer; this changes its location only. */
export function RequestProductSupplierRoutes({ requestId, items, suppliers, defaultZipCode = "11516" }: { requestId: string; items: ReviewableMaterialItem[]; suppliers: RequestRouteSupplier[]; defaultZipCode?: string }) {
  const groups = new Map<string, ReviewableMaterialItem[]>()
  for (const item of items) {
    const group = similarItemGroupLabel(item)
    groups.set(group, [...(groups.get(group) || []), item])
  }
  return <details id="request-supplier-routing" className="mb-3 rounded-xl border border-slate-200 bg-white">
    <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-bold text-[#0066cc]">Choose suppliers · group or product</summary>
    <div className="grid gap-3 border-t border-slate-100 p-3">{[...groups].map(([label, rows]) => {
      const groupMetadata = rows.find((item) => item.metadata?.supplier_route_group_key === label.toLowerCase() && item.metadata?.supplier_route_group_default)?.metadata
      return <section key={label} className="rounded-lg border border-slate-200 p-3"><h4 className="mb-2 text-xs font-bold">{label} · {rows.length} products</h4>
        <RequestSupplierRouteEditor requestId={requestId} mode="group" groupMetadata={groupMetadata} groupKey={label} itemIds={rows.map((item) => item.id)} metadata={rows[0]?.metadata} itemRouteVersions={Object.fromEntries(rows.map((item) => [item.id, Number(item.metadata?.supplier_route_revision || 0)]))} suppliers={suppliers} />
        <RequestGroupSupplierDiscovery requestId={requestId} group={label} items={rows} allItems={items} defaultZipCode={defaultZipCode} />
        <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-slate-600">Different supplier for one product</summary><div className="grid gap-3">{rows.map((item) => <div key={item.id}><p className="mb-1 text-xs font-bold">{item.name} · {item.quantity} {item.unit}</p><RequestSupplierRouteEditor requestId={requestId} itemId={item.id} groupMetadata={groupMetadata} groupKey={label} itemIds={[item.id]} metadata={item.metadata} itemRouteVersions={{ [item.id]: Number(item.metadata?.supplier_route_revision || 0) }} suppliers={suppliers} /></div>)}</div></details>
      </section>
    })}</div>
  </details>
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import {
  assignSupplierPackageAction,
  returnSupplierPackageForInfoAction,
  updateSupplierPackageAction,
} from "@/app/preview-admin/workflow-actions"

type SupplierOption = { id: string; name: string }

export function SupplierApprovalActions({
  packageId,
  requestId,
  status,
  initialSupplierId,
  suppliers,
}: {
  packageId: string
  requestId: string
  status: string
  initialSupplierId: string
  suppliers: SupplierOption[]
}) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState(initialSupplierId)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    startTransition(async () => {
      setMessage(null)
      const result = await action()
      setMessage(result.ok ? success : result.error)
      if (result.ok) router.refresh()
    })
  }

  function cancelPackage() {
    if (!window.confirm("Cancel this supplier package? Nothing will be sent.")) return
    run(() => updateSupplierPackageAction({ packageId, status: "cancelled" }), "Supplier package cancelled.")
  }

  function returnForInfo() {
    if (!window.confirm("Return this request to Draft so the client can add information?")) return
    run(() => returnSupplierPackageForInfoAction({ packageId, requestId }), "Request returned for more information.")
  }

  const canReview = status === "pending_approval"
  const canAssign = status === "pending_approval" || status === "approved"

  return (
    <section className="border-t border-slate-200 pt-5">
      <h2 className="text-lg font-bold text-slate-950">Approval controls</h2>
      <p className="mt-1 text-sm text-slate-600">Choose the supplier and review the complete request before approval. Approval does not send anything yet.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Assigned supplier
          <select
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            disabled={!canAssign || isPending}
            className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100"
          >
            <option value="">Choose supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
        <button
          type="button"
          disabled={!canAssign || isPending || !supplierId || supplierId === initialSupplierId}
          onClick={() => run(() => assignSupplierPackageAction({ packageId, supplierId }), "Supplier assignment saved.")}
          className="min-h-12 self-end rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 disabled:opacity-40"
        >
          Save supplier
        </button>
      </div>

      {canReview ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button type="button" disabled={isPending || !supplierId} onClick={() => run(() => updateSupplierPackageAction({ packageId, status: "approved" }), "Package approved. Automatic sending remains disabled.")} className="min-h-12 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-40">Approve package</button>
          <button type="button" disabled={isPending} onClick={returnForInfo} className="min-h-12 rounded-lg border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-800 disabled:opacity-40">Request more information</button>
          <button type="button" disabled={isPending} onClick={cancelPackage} className="min-h-12 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-40">Cancel package</button>
        </div>
      ) : null}

      {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">{message}</p> : null}
    </section>
  )
}

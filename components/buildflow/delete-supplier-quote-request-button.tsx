"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { deleteSupplierQuoteRequestAction } from "@/app/admin/supplier-requests/actions"

export function DeleteSupplierQuoteRequestButton({ requestId, supplierName }: { requestId: string; supplierName: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function deleteRequest() {
    const confirmed = window.confirm(
      `Delete this sent request to ${supplierName}? This cannot be undone. The supplier will remain in the directory.`,
    )
    if (!confirmed) return

    setError("")
    startTransition(async () => {
      const result = await deleteSupplierQuoteRequestAction(requestId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={deleteRequest}
        disabled={pending}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        {pending ? "Deleting..." : "Delete request"}
      </button>
      {error ? <p role="alert" className="max-w-64 text-right text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}

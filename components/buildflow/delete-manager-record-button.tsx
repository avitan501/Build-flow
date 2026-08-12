"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { deleteCustomerAction, deleteOpenRequestAction, deleteProjectAction } from "@/app/admin/users/actions"

type DeleteManagerRecordButtonProps = {
  id: string
  kind: "customer" | "project" | "request"
  label: string
  projectCount?: number
  requestCount?: number
}

export function DeleteManagerRecordButton({
  id,
  kind,
  label,
  projectCount = 0,
  requestCount = 0,
}: DeleteManagerRecordButtonProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function confirmDeletion() {
    if (kind === "customer") {
      const related = `${projectCount} project${projectCount === 1 ? "" : "s"} and ${requestCount} request${requestCount === 1 ? "" : "s"}`
      return window.prompt(
        `Permanently delete ${label}, the login account, and ${related}? Type DELETE to confirm.`,
      ) === "DELETE"
    }

    const details = kind === "project"
      ? ` This also deletes ${requestCount} related request${requestCount === 1 ? "" : "s"}.`
      : " This deletes only this open request."
    return window.confirm(`Delete ${kind} “${label}”?${details} This cannot be undone.`)
  }

  function deleteRecord() {
    if (!confirmDeletion()) return

    setMessage("")
    startTransition(async () => {
      const result = kind === "customer"
        ? await deleteCustomerAction(id)
        : kind === "project"
          ? await deleteProjectAction(id)
          : await deleteOpenRequestAction(id)

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      if (result.warning) setMessage(result.warning)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={deleteRecord}
        disabled={pending}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        {pending ? "Deleting..." : `Delete ${kind}`}
      </button>
      {message ? <p role="alert" className="max-w-80 text-xs font-semibold text-rose-700">{message}</p> : null}
    </div>
  )
}

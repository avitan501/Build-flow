"use client"

import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { updateMaterialRequestAssigneeAction, type MaterialRequestAssignee } from "@/app/owner/materials/requests/actions"

const assignees: Array<{ value: MaterialRequestAssignee; label: string }> = [
  { value: "carlos", label: "Carlos" },
  { value: "david", label: "David" },
]

export function MaterialRequestAssigneeControl({ requestId, assignee, compact = false }: { requestId: string; assignee: string; compact?: boolean }) {
  const router = useRouter()
  const normalized = assignees.some((option) => option.value === assignee) ? assignee as MaterialRequestAssignee : "carlos"
  const [selected, setSelected] = useState<MaterialRequestAssignee>(normalized)
  const [saved, setSaved] = useState<MaterialRequestAssignee>(normalized)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")

  function update(next: MaterialRequestAssignee) {
    setSelected(next)
    setMessage("")
    startTransition(async () => {
      const result = await updateMaterialRequestAssigneeAction({ requestId, assignee: next })
      if (!result.ok) {
        setSelected(saved)
        setMessage(result.error)
        return
      }
      setSaved(next)
      setMessage(`Assigned to ${next === "david" ? "David" : "Carlos"}.`)
      router.refresh()
    })
  }

  return <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">Assigned to
    <span className="relative block">
      <select value={selected} onChange={(event) => update(event.target.value as MaterialRequestAssignee)} disabled={pending} className={`${compact ? "h-8 pr-8 text-xs" : "h-9 pr-9 text-sm"} w-full rounded-md border border-slate-300 bg-white pl-2.5 font-semibold normal-case tracking-normal text-slate-900 disabled:opacity-60`}>
        {assignees.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {pending ? <LoaderCircle className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" /> : null}
    </span>
    {message ? <span role="status" className={`normal-case tracking-normal ${message.startsWith("Assigned") ? "text-emerald-700" : "text-rose-700"}`}>{message}</span> : null}
  </label>
}

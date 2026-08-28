"use client"

import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { setFixedManagerGoalStatusAction, setManagerGoalStatusAction } from "@/app/admin/goals-progress/goal-actions"
import type { CarlosFixedGoalKey, ManagerGoalStatus } from "@/lib/manager-goal-status"

const options: Array<{ value: ManagerGoalStatus; label: string }> = [
  { value: "open", label: "In progress" },
  { value: "completed", label: "Done" },
  { value: "archived", label: "Archived" },
]

const tone: Record<ManagerGoalStatus, string> = {
  open: "border-sky-200 bg-sky-50 text-sky-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
}

export function ManagerGoalStatusSelect({ goalId, fixedKey, status }: { goalId?: string; fixedKey?: CarlosFixedGoalKey; status: ManagerGoalStatus }) {
  const router = useRouter()
  const [selected, setSelected] = useState(status)
  const [saved, setSaved] = useState(status)
  const [pending, startTransition] = useTransition()

  function update(next: ManagerGoalStatus) {
    setSelected(next)
    startTransition(async () => {
      const result = goalId
        ? await setManagerGoalStatusAction({ id: goalId, status: next })
        : fixedKey
          ? await setFixedManagerGoalStatusAction({ key: fixedKey, status: next })
          : { ok: false as const, error: "This goal could not be identified." }
      if (!result.ok) {
        setSelected(saved)
        return
      }
      setSaved(next)
      router.refresh()
    })
  }

  return <span className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
    <select aria-label="Goal status" value={selected} onChange={(event) => update(event.target.value as ManagerGoalStatus)} disabled={pending} className={`h-7 max-w-[7.5rem] rounded-full border pl-2.5 pr-7 text-[10px] font-bold ${tone[selected]} disabled:opacity-60`}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {pending ? <LoaderCircle className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin" /> : null}
  </span>
}

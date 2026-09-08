"use client"

import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckSquare2,
  ClipboardList,
  Flame,
  ListPlus,
  LoaderCircle,
  MessageCircleQuestion,
  MoreHorizontal,
  RotateCcw,
  Truck,
  UserRoundCheck,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import {
  applyManagerRequestQuickAction,
  type ManagerRequestQuickAction,
} from "@/app/admin/build-map/actions"
import {
  updateMaterialRequestAssigneeAction,
  type MaterialRequestAssignee,
} from "@/app/owner/materials/requests/actions"
import type {
  ManagerPipelineStage,
  ManagerRequestQueueState,
} from "@/lib/manager-dashboard"

export type ManagerRequestQuickRow = {
  id: string
  title: string
  clientLabel: string
  stage: ManagerPipelineStage
  stageLabel: string
  updatedLabel: string
  queueState: ManagerRequestQueueState
  assignee: MaterialRequestAssignee
}

const stagePresentation = {
  received: {
    icon: ClipboardList,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  pricing: {
    icon: BadgeDollarSign,
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  approval: {
    icon: MessageCircleQuestion,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  delivery: {
    icon: Truck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
} satisfies Record<ManagerPipelineStage, { icon: typeof ClipboardList; tone: string }>

const quickActions: Array<{
  value: ManagerRequestQuickAction
  label: string
  icon: typeof ListPlus
  tone?: string
}> = [
  { value: "queue", label: "Queue", icon: ListPlus },
  { value: "rush", label: "Rush", icon: Flame, tone: "text-rose-700" },
  { value: "next", label: "Next step", icon: ArrowRight },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "normal", label: "Clear flag", icon: RotateCcw },
]

function compactRequestStatus(label: string) {
  const normalized = label.trim().toLocaleLowerCase()
  if (normalized === "received / needs shopping") return "Received"
  if (normalized === "priced / not sent") return "Pricing"
  if (normalized === "waiting for client") return "Client"
  if (normalized === "payment received / delivery") return "Payment"
  if (normalized === "ai organized") return "AI"
  if (normalized === "supplier route" || normalized === "route selected") return "Route"
  if (normalized === "requests sent") return "Sent"
  if (normalized === "quotes received") return "Quotes"
  return label.trim()
}

export function RequestQuickActionsList({ rows }: { rows: ManagerRequestQuickRow[] }) {
  const router = useRouter()
  const touchStartX = useRef<number | null>(null)
  const [multi, setMulti] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isError, setIsError] = useState(false)
  const [pending, startTransition] = useTransition()

  function leaveMultiMode() {
    setMulti(false)
    setSelected(new Set())
    setOpenMenuId(null)
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function run(action: ManagerRequestQuickAction, ids: string[]) {
    if (!ids.length || pending) return
    if (action === "archive" && !window.confirm(`Archive ${ids.length === 1 ? "this request" : `${ids.length} requests`}? You can restore them from the request page.`)) return
    if (action === "next" && rows.some((row) => ids.includes(row.id) && row.stage === "delivery") && !window.confirm("A request already in Delivery will be archived when moved to its next step. Continue?")) return

    setFeedback("")
    setIsError(false)
    setOpenMenuId(null)
    startTransition(async () => {
      const result = await applyManagerRequestQuickAction({ requestIds: ids, action })
      if (!result.ok) {
        setIsError(true)
        setFeedback(result.error)
        return
      }
      const label = action === "archive"
        ? "Archived"
        : action === "next"
          ? "Moved forward"
          : action === "rush"
            ? "Marked Rush"
            : action === "queue"
              ? "Added to Queue"
              : "Flag cleared"
      setFeedback(`${label}: ${result.changed}`)
      leaveMultiMode()
      router.refresh()
    })
  }

  function assign(row: ManagerRequestQuickRow, assignee: MaterialRequestAssignee) {
    if (pending) return
    if (row.assignee === assignee) {
      setOpenMenuId(null)
      return
    }

    setFeedback("")
    setIsError(false)
    setOpenMenuId(null)
    startTransition(async () => {
      const result = await updateMaterialRequestAssigneeAction({
        requestId: row.id,
        assignee,
      })
      if (!result.ok) {
        setIsError(true)
        setFeedback(result.error)
        return
      }
      setFeedback(`Assigned to ${assignee === "david" ? "David" : "Carlos"}`)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <div className="flex min-h-9 items-center justify-between border-b border-slate-100 px-3 py-1.5">
        <p role="status" className={`min-w-0 truncate text-[11px] font-semibold ${isError ? "text-rose-700" : "text-slate-500"}`}>
          {feedback || (multi ? `${selected.size} selected` : "Swipe or tap •••")}
        </p>
        <button
          type="button"
          aria-pressed={multi}
          aria-label={multi ? "Exit multi-select" : "Select multiple requests"}
          title={multi ? "Done selecting" : "Select multiple"}
          onClick={() => multi ? leaveMultiMode() : setMulti(true)}
          className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-bold transition ${multi ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          {multi ? <X className="h-3.5 w-3.5" /> : <CheckSquare2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{multi ? "Done" : "Multi"}</span>
        </button>
      </div>

      {rows.map((row) => {
        const presentation = stagePresentation[row.stage]
        const StatusIcon = presentation.icon
        const compactStatus = compactRequestStatus(row.stageLabel)
        const isSelected = selected.has(row.id)
        return (
          <div
            key={row.id}
            onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }}
            onTouchEnd={(event) => {
              const endX = event.changedTouches[0]?.clientX
              if (touchStartX.current !== null && endX !== undefined && touchStartX.current - endX > 42) setOpenMenuId(row.id)
              touchStartX.current = null
            }}
            className={`relative flex min-h-16 items-center border-b border-slate-100 px-3 last:border-b-0 ${isSelected ? "bg-sky-50" : "bg-white hover:bg-slate-50"}`}
          >
            {multi ? (
              <button
                type="button"
                aria-label={`${isSelected ? "Deselect" : "Select"} ${row.title}`}
                onClick={() => toggleSelected(row.id)}
                className={`mr-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${isSelected ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-slate-300 bg-white text-transparent"}`}
              >
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <span
                aria-label={`Status: ${row.stageLabel}`}
                title={`Request status: ${row.stageLabel}`}
                className={`mr-3 inline-flex h-10 w-[3.4rem] shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border px-1 ${presentation.tone}`}
              >
                <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="block max-w-full truncate text-[7px] font-black uppercase leading-none tracking-[.03em]">{compactStatus}</span>
              </span>
            )}

            <Link
              href={`/owner/materials/requests/${row.id}`}
              onClick={(event) => {
                if (!multi) return
                event.preventDefault()
                toggleSelected(row.id)
              }}
              className="min-w-0 flex-1 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3]"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-slate-950">{row.title}</span>
                {row.queueState === "rush" ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-700"><Flame className="h-2.5 w-2.5" />Rush</span>
                ) : row.queueState === "queued" ? (
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-600">Queue</span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{row.clientLabel}</span>
            </Link>

            <span className="ml-2 hidden shrink-0 text-xs text-slate-400 sm:block">{row.updatedLabel}</span>
            {!multi ? (
              <div className="relative ml-2 shrink-0">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === row.id}
                  aria-label={`Quick actions for ${row.title}`}
                  title="Quick actions"
                  onClick={() => setOpenMenuId((current) => current === row.id ? null : row.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {openMenuId === row.id ? (
                  <div role="menu" className="absolute bottom-10 right-0 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                    {quickActions.map((action) => {
                      const ActionIcon = action.icon
                      return (
                        <button
                          key={action.value}
                          type="button"
                          role="menuitem"
                          disabled={pending}
                          onClick={() => run(action.value, [row.id])}
                          className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 ${action.tone || "text-slate-700"}`}
                        >
                          <ActionIcon className="h-3.5 w-3.5" />{action.label}
                        </button>
                      )
                    })}
                    <div className="my-1 border-t border-slate-100" />
                    {(["david", "carlos"] as const).map((assignee) => {
                      const name = assignee === "david" ? "David" : "Carlos"
                      const selectedAssignee = row.assignee === assignee
                      return (
                        <button
                          key={assignee}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selectedAssignee}
                          disabled={pending}
                          onClick={() => assign(row, assignee)}
                          className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 ${selectedAssignee ? "bg-sky-50 text-[#0066cc]" : "text-slate-700"}`}
                        >
                          <UserRoundCheck className="h-3.5 w-3.5" />
                          <span className="min-w-0 flex-1">Assign to {name}</span>
                          {selectedAssignee ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}

      {multi && selected.size ? (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl" aria-label="Bulk request actions">
          <span className="px-2 text-xs font-black tabular-nums text-slate-700">{selected.size}</span>
          {quickActions.slice(0, 4).map((action) => {
            const ActionIcon = action.icon
            return (
              <button
                key={action.value}
                type="button"
                disabled={pending}
                aria-label={`${action.label} selected requests`}
                title={action.label}
                onClick={() => run(action.value, [...selected])}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-50 ${action.tone || "text-slate-700"}`}
              >
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ActionIcon className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

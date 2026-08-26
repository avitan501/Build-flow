import { BadgeDollarSign, Check, ClipboardList, MessageSquareText, Sparkles } from "lucide-react"

type WorkflowStepStatus = "complete" | "active" | "upcoming"
type WorkflowStepIcon = "review" | "organize" | "pricing" | "reply"

const icons = {
  review: ClipboardList,
  organize: Sparkles,
  pricing: BadgeDollarSign,
  reply: MessageSquareText,
} as const

const statusStyles: Record<WorkflowStepStatus, { card: string; number: string; pill: string; label: string }> = {
  complete: {
    card: "border-emerald-200 bg-[linear-gradient(110deg,#ffffff_0%,#f0fdf4_100%)] shadow-[0_8px_24px_rgba(5,150,105,0.08)]",
    number: "border-emerald-600 bg-emerald-600 text-white",
    pill: "bg-emerald-100 text-emerald-800",
    label: "Done",
  },
  active: {
    card: "border-sky-300 bg-[linear-gradient(110deg,#ffffff_0%,#eff6ff_100%)] shadow-[0_10px_28px_rgba(2,132,199,0.12)] ring-1 ring-sky-100",
    number: "border-[#0066cc] bg-[#0066cc] text-white",
    pill: "bg-sky-100 text-sky-800",
    label: "In progress",
  },
  upcoming: {
    card: "border-slate-200 bg-white",
    number: "border-slate-300 bg-slate-50 text-slate-500",
    pill: "bg-slate-100 text-slate-600",
    label: "Next",
  },
}

export function workflowStepCardClass(status: WorkflowStepStatus) {
  return `group overflow-hidden rounded-2xl border transition ${statusStyles[status].card}`
}

export function RequestWorkflowStepHeader({
  step,
  title,
  detail,
  status,
  icon,
}: {
  step: 1 | 2 | 3 | 4
  title: string
  detail: string
  status: WorkflowStepStatus
  icon: WorkflowStepIcon
}) {
  const Icon = icons[icon]
  const styles = statusStyles[status]

  return (
    <summary className="flex min-h-[5.5rem] cursor-pointer list-none items-center gap-4 px-4 py-3.5 sm:px-5">
      <span className={`relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl font-black tabular-nums ${styles.number}`} aria-label={`Step ${step}`}>
        {step}
        {status === "complete" ? <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-700 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Step {step} of 4</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] ${styles.pill}`}>{status === "complete" ? "✓ " : ""}{styles.label}</span>
        </span>
        <span className="mt-1 flex items-center gap-2 text-base font-black text-slate-950 sm:text-lg"><Icon className="h-4 w-4 shrink-0 text-[#0066cc]" />{title}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 sm:text-sm">{detail}</span>
      </span>
      <span className="text-xl text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
    </summary>
  )
}

import { CheckCircle2 } from "lucide-react"

export type CarlosDailyGoal = {
  key: "leads" | "clients" | "vendors" | "quotes" | "closed"
  label: string
  count: number
  target: number
}

export function CarlosDailyScorecard({ goals }: { goals: CarlosDailyGoal[] }) {
  const completed = goals.reduce((sum, goal) => sum + Math.min(goal.count, goal.target), 0)
  const target = goals.reduce((sum, goal) => sum + goal.target, 0)
  const percent = target ? Math.round((completed / target) * 100) : 0

  return <section className="mb-3 overflow-hidden rounded-lg border border-sky-200 bg-white shadow-sm" aria-labelledby="carlos-daily-goals-title">
    <header className="flex items-center justify-between gap-3 border-b border-sky-100 bg-sky-50 px-3 py-2.5">
      <div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-sky-700">Today · New York time</p><h2 id="carlos-daily-goals-title" className="text-sm font-bold">Carlos daily wins</h2></div>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-sky-800">{percent}%</span>
    </header>
    <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-5">
      {goals.map((goal) => {
        const done = goal.count >= goal.target
        return <div key={goal.key} className="min-w-0 bg-white px-3 py-3">
          <div className="flex items-center gap-1.5"><strong className={done ? "text-emerald-700" : "text-slate-950"}>{Math.min(goal.count, goal.target)}/{goal.target}</strong>{done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}</div>
          <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{goal.label}</p>
        </div>
      })}
    </div>
    <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-4 text-slate-500">Updated only from saved, successful website activity. Failed attempts and repeated rows do not earn credit.</p>
  </section>
}

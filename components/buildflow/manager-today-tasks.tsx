"use client"

import { Check, LoaderCircle, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

import { createTodayTaskAction, setTodayTaskCompletedAction } from "@/app/admin/build-map/actions"

export type ManagerTodayTask = {
  id: string
  title: string
  status: "open" | "completed"
  created_at: string
}

function addedTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function ManagerTodayTasks({ tasks }: { tasks: ManagerTodayTask[] }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")
  const [adding, setAdding] = useState(false)
  const [pending, startTransition] = useTransition()
  const openCount = tasks.filter((task) => task.status === "open").length

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    startTransition(async () => {
      const result = await createTodayTaskAction(title)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTitle("")
      setAdding(false)
      router.refresh()
    })
  }

  function toggleTask(task: ManagerTodayTask) {
    setError("")
    startTransition(async () => {
      const result = await setTodayTaskCompletedAction({ id: task.id, completed: task.status === "open" })
      if (!result.ok) setError(result.error)
      else router.refresh()
    })
  }

  return <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="today-tasks-heading">
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div><h2 id="today-tasks-heading" className="font-semibold">Today&apos;s tasks</h2><p className="mt-0.5 text-xs text-slate-500">{openCount} open · Times shown in New York</p></div>
      <div className="flex items-center gap-2">{pending ? <LoaderCircle className="h-4 w-4 animate-spin text-[#0071e3]" aria-label="Saving task" /> : null}<button type="button" onClick={() => setAdding((value) => !value)} aria-label="Add a task" aria-expanded={adding} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white"><Plus className={`h-4 w-4 transition ${adding ? "rotate-45" : ""}`} /></button></div>
    </header>
    {adding ? <form onSubmit={addTask} className="flex gap-2 border-b border-slate-100 p-3 sm:p-4">
      <label className="sr-only" htmlFor="today-task-title">Add today&apos;s task</label>
      <input id="today-task-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Add a task" className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100" />
      <button type="submit" disabled={pending || title.trim().length < 2} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add task</span></button>
    </form> : null}
    {tasks.length ? <div className="divide-y divide-slate-100">{tasks.map((task) => {
      const completed = task.status === "completed"
      return <button key={task.id} type="button" role="checkbox" aria-checked={completed} disabled={pending} onClick={() => toggleTask(task)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60 sm:px-5">
        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent"}`}><Check className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold leading-5 ${completed ? "text-slate-400 line-through" : "text-slate-950"}`}>{task.title}</span><span className="mt-0.5 block text-[11px] font-medium text-slate-400">Added {addedTime(task.created_at)}</span></span>
      </button>
    })}</div> : <p className="px-4 py-5 text-center text-sm text-slate-500">No tasks yet. Use + to add one.</p>}
    {error ? <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
  </section>
}

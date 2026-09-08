"use client"

import { ChevronRight, Clock3, X } from "lucide-react"
import { useId, useRef } from "react"

import { formatSiteDateTime } from "@/lib/site-date-time"

export type RequestActivityEvent = {
  id: string
  title: string
  description?: string | null
  createdAt: string
}

function activityDate(value: string) {
  return formatSiteDateTime(value, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function RequestActivityLog({
  events,
}: {
  events: readonly RequestActivityEvent[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const latestEvent = events[0] ?? null

  function openLog() {
    dialogRef.current?.showModal()
  }

  function closeLog() {
    dialogRef.current?.close()
  }

  return (
    <section className="mt-2" aria-label="Request activity">
      <button
        ref={triggerRef}
        type="button"
        onClick={openLog}
        disabled={!latestEvent}
        aria-haspopup="dialog"
        className="group flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left shadow-[0_3px_12px_rgba(15,23,42,0.035)] transition hover:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:cursor-default disabled:text-slate-400"
      >
        <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#0066cc]" aria-hidden="true" />
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-500">
          Activity
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
          {latestEvent?.title ?? "No activity recorded yet"}
        </span>
        {latestEvent ? (
          <>
            <time className="hidden shrink-0 text-[10px] text-slate-400 sm:block" dateTime={latestEvent.createdAt}>
              {activityDate(latestEvent.createdAt)}
            </time>
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-500">
              {events.length}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </>
        ) : null}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.currentTarget === event.target) closeLog()
        }}
        className="m-auto max-h-[min(82vh,48rem)] w-[min(42rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex max-h-[min(82vh,48rem)] flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#0066cc]">
                Request history
              </p>
              <h2 id={titleId} className="truncate text-lg font-bold text-slate-950">
                Activity log
              </h2>
            </div>
            <button
              type="button"
              onClick={closeLog}
              autoFocus
              aria-label="Close activity log"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5">
            {events.map((event) => (
              <article key={event.id} className="border-b border-slate-100 py-3 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-sm font-bold leading-5 text-slate-900">
                    {event.title}
                  </h3>
                  <time className="shrink-0 text-[10px] leading-5 text-slate-500" dateTime={event.createdAt}>
                    {activityDate(event.createdAt)}
                  </time>
                </div>
                {event.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                    {event.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </dialog>
    </section>
  )
}

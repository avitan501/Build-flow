"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { GUEST_PROJECTS_UPDATED_EVENT, readGuestProjects, selectGuestProject, type GuestProject } from "@/lib/guest-projects"

function projectShopHref(project: GuestProject) {
  const address = project.address || project.name
  return `/shop?address=${encodeURIComponent(address)}`
}

export function GuestProjectsPanel() {
  const [projects, setProjects] = useState<GuestProject[]>([])

  useEffect(() => {
    const sync = () => setProjects(readGuestProjects())
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener(GUEST_PROJECTS_UPDATED_EVENT, sync as EventListener)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(GUEST_PROJECTS_UPDATED_EVENT, sync as EventListener)
    }
  }, [])

  return (
    <section className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Guest projects</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Saved on this device</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">You can build the cart without logging in. Sign in only when you submit the quote.</p>
        </div>
        <Link href="/projects/new?next=%2Fshop" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">
          New project
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={projectShopHref(project)}
              onClick={() => selectGuestProject(project.id)}
              className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 transition active:scale-[0.99]"
            >
              <div className="text-sm font-semibold text-slate-950">{project.name}</div>
              <div className="mt-1 text-xs text-slate-500">{project.address || "No address yet"}</div>
              <div className="mt-2 text-xs font-semibold text-sky-700">Continue building</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          No guest projects saved yet. Start a project, choose materials, and submit the cart when ready.
        </div>
      )}
    </section>
  )
}

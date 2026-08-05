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
  const [showAllProjects, setShowAllProjects] = useState(false)
  const displayedProjects = showAllProjects ? projects : projects.slice(0, 3)

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
    <section>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Saved on this device</p>
        <h2 className="mt-1 text-xl font-semibold text-[#101828]">Recent Projects</h2>
        <p className="mt-1 text-sm leading-6 text-[#667085]">Sign in to create a project and keep requests available on every device.</p>
      </div>

      {projects.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <div className={`grid gap-2 ${showAllProjects ? "max-h-[22rem] overflow-y-auto [overscroll-behavior:contain]" : ""}`}>
            {displayedProjects.map((project) => (
              <Link
                key={project.id}
                href={projectShopHref(project)}
                onClick={() => selectGuestProject(project.id)}
                data-testid="guest-project-card"
                className="rounded-[16px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-[0_5px_18px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow,transform] hover:border-[#b9d7ff] hover:shadow-[0_8px_22px_rgba(16,24,40,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] active:scale-[0.99]"
              >
                <div className="text-sm font-semibold text-slate-950">{project.name}</div>
                <div className="mt-1 text-xs text-slate-500">{project.address && project.address.trim() !== project.name.trim() ? project.address : "Saved on this device"}</div>
                <div className="mt-2 text-xs font-semibold text-sky-700">Continue building</div>
              </Link>
            ))}
          </div>
          {projects.length > 3 ? (
            <button type="button" onClick={() => setShowAllProjects((showAll) => !showAll)} className="min-h-10 rounded-full border border-[#d0d5dd] bg-white px-4 text-sm font-semibold text-[#0066cc] transition-colors hover:bg-[#f5f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]">
              {showAllProjects ? "Show recent projects" : `Show all ${projects.length} projects`}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[16px] border border-dashed border-[#d0d5dd] bg-white px-4 py-6 text-sm text-[#667085]">
          No guest projects saved yet. Start a project, choose materials, and submit the request when ready.
        </div>
      )}
    </section>
  )
}

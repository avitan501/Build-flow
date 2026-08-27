"use client"

import { useState, type ReactNode } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { getQualificationSettingForPlanRequest } from "@/lib/shop-qualification"
import type { ProjectRecord } from "@/lib/projects"

type PlanRequestUploadCardProps = {
  requestId: string
  label: string
  description: string
  category: string
  questionnaireDepartment?: string
  accept: string
  icon: ReactNode
  projects?: ProjectRecord[]
  selectedProjectId?: string
  compact?: boolean
}

export function PlanRequestUploadCard({ requestId, label, description, category, questionnaireDepartment, accept, icon, projects = [], selectedProjectId = "", compact = false }: PlanRequestUploadCardProps) {
  const [file, setFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState(selectedProjectId || projects[0]?.id || "")
  const [completed, setCompleted] = useState(false)
  const product = {
    id: requestId,
    name: label,
    category,
    productType: "service" as const,
    price: 0,
    unit: "Upload",
  }
  const questions = getQualificationSettingForPlanRequest(requestId, label, category).questions

  return (
    <article className={`touch-manipulation rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${compact ? "p-3 sm:p-4" : "flex min-h-[164px] flex-col justify-between p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex shrink-0 items-center justify-center bg-slate-950 text-white ${compact ? "h-10 w-10 rounded-xl [&>svg]:h-5 [&>svg]:w-5" : "h-12 w-12 rounded-2xl"}`}>{icon}</span>
        {file ? <span className="max-w-[55%] truncate rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{file.name}</span> : null}
      </div>
      <div className={compact ? "mt-3" : "mt-4"}>
        <h3 className="text-base font-bold leading-5 text-slate-950">{label}</h3>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
        <div className={`${compact ? "mt-2" : "mt-3"} grid gap-2`}>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <input aria-label={label} type="file" accept={accept} className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setCompleted(false) }} />
            {file ? "Change File" : "Choose File"}
          </label>
          {file && projects.length > 0 ? (
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Attach to project
              <select aria-label={`${label} project`} value={projectId} onChange={(event) => setProjectId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.address ? ` · ${project.address}` : ""}</option>)}
              </select>
            </label>
          ) : null}
          {file ? <AddToProjectButton product={product} file={file} projectId={projectId || undefined} questions={questions} questionnaireDepartment={questionnaireDepartment ?? category} className="w-full" label="Upload and process" onAdded={() => setCompleted(true)} /> : null}
          {completed ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">File uploaded, processed, and attached to the project request.</p> : null}
        </div>
      </div>
    </article>
  )
}

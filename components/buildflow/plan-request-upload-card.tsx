"use client"

import { useState, type ReactNode } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { getQualificationSettingForPlanRequest } from "@/lib/shop-qualification"

type PlanRequestUploadCardProps = {
  requestId: string
  label: string
  description: string
  category: string
  accept: string
  icon: ReactNode
}

export function PlanRequestUploadCard({ requestId, label, description, category, accept, icon }: PlanRequestUploadCardProps) {
  const [file, setFile] = useState<File | null>(null)
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
    <article className="flex min-h-[164px] touch-manipulation flex-col justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</span>
        {file ? <span className="max-w-[55%] truncate rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{file.name}</span> : null}
      </div>
      <div className="mt-4">
        <h3 className="text-base font-bold leading-5 text-slate-950">{label}</h3>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
        <div className="mt-3 grid gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <input type="file" accept={accept} className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            {file ? "Change File" : "Choose File"}
          </label>
          {file ? <AddToProjectButton product={product} file={file} questions={questions} questionnaireDepartment={category} className="w-full" label="Add Plan to Project" /> : null}
        </div>
      </div>
    </article>
  )
}

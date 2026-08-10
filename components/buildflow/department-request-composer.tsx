"use client"

import { FileUp, X } from "lucide-react"
import { useState } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"

export function DepartmentRequestComposer({ category, displayCategory = category, requestId, questionnaireDepartment, allowUpload = false }: { category: string; displayCategory?: string; requestId: string; questionnaireDepartment?: string; allowUpload?: boolean }) {
  const [details, setDetails] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const trimmedDetails = details.trim()
  const canSubmit = Boolean(trimmedDetails || file)

  return (
    <section className="border-t border-slate-200 bg-white py-6 sm:py-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Order request</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Place an order here</h2>
        <p className="mt-1 text-sm text-slate-600">Write what you need or attach a blueprint or shopping list. We will keep everything with your project.</p>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Example: Include the material, size, quantity, accessories, and delivery details."
          className="mt-4 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
        {allowUpload ? (
          <div className="mt-3">
            {file ? (
              <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600" aria-label="Remove attachment">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50">
                <FileUp className="h-5 w-5" />
                <span>Attach blueprint or shopping list</span>
                <input type="file" accept=".csv,.xls,.xlsx,.pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
        ) : null}
        <div className="mt-3 flex justify-end">
          {canSubmit ? (
            <AddToProjectButton
              product={{ id: `${requestId}-custom-request`, name: `${displayCategory} custom request`, category, productType: "service", price: 0, unit: "Request" }}
              details={trimmedDetails}
              file={file}
              questionnaireDepartment={questionnaireDepartment ?? category}
              label="Continue"
            />
          ) : (
            <button type="button" disabled className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-200 px-5 text-sm font-semibold text-slate-500">
              Continue
            </button>
          )}
        </div>
      </div>

    </section>
  )
}

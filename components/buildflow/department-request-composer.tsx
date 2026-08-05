"use client"

import { useState } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"

export function DepartmentRequestComposer({ category, requestId }: { category: string; requestId: string }) {
  const [details, setDetails] = useState("")
  const trimmedDetails = details.trim()

  return (
    <section className="border-t border-slate-200 bg-white py-6 sm:py-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Custom request</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Tell us what you need</h2>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Paste a list or describe the materials, sizes, quantities, and delivery details."
          className="mt-4 w-full resize-y border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
        <div className="mt-3 flex justify-end">
          {trimmedDetails ? (
            <AddToProjectButton
              product={{ id: `${requestId}-custom-request`, name: `${category} custom request`, category, productType: "service", price: 0, unit: "Request" }}
              details={trimmedDetails}
              label="Add Request to Project"
            />
          ) : (
            <button type="button" disabled className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-200 px-5 text-sm font-semibold text-slate-500">
              Add Request to Project
            </button>
          )}
        </div>
      </div>

    </section>
  )
}

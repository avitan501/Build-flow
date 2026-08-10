"use client"

import { useState } from "react"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { MaterialQuestionnaireWizard } from "@/components/buildflow/material-questionnaire-wizard"
import type { MaterialAnswerValue, MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

export function EmbeddedMaterialQuickOrder({ snapshot, category, displayCategory, requestId }: {
  snapshot: MaterialQuestionnaireSnapshot
  category: string
  displayCategory: string
  requestId: string
}) {
  const [completedAnswers, setCompletedAnswers] = useState<Record<string, MaterialAnswerValue> | null>(null)

  if (completedAnswers) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Details ready</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Add this flooring request to a project</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your eight answers are ready. Choose the project where this request belongs.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <AddToProjectButton
            product={{ id: `${requestId}-quick-order`, name: `${displayCategory} Quick Order`, category, productType: "service", price: 0, unit: "Request" }}
            questionnaireDepartment={category}
            materialAnswers={completedAnswers}
            label="Choose project"
          />
          <button type="button" onClick={() => setCompletedAnswers(null)} className="min-h-12 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700">Edit answers</button>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <MaterialQuestionnaireWizard
        snapshot={snapshot}
        displayMode="all"
        embedded
        requireCompletion
        onSave={async (answers, complete) => {
          if (complete) setCompletedAnswers(answers)
          return { ok: true }
        }}
      />
    </section>
  )
}

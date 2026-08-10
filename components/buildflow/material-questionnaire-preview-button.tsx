"use client"

import { useState } from "react"

import { MaterialQuestionnaireWizard } from "@/components/buildflow/material-questionnaire-wizard"
import type { MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

export function MaterialQuestionnairePreviewButton({ snapshot }: { snapshot: MaterialQuestionnaireSnapshot }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,113,227,0.22)] transition hover:bg-[#0066cc]">
        <span className="text-xl leading-none">+</span>
        <span>Start quick order</span>
      </button>
      {open ? (
        <MaterialQuestionnaireWizard
          snapshot={snapshot}
          onClose={() => setOpen(false)}
          onSave={async () => {
            setOpen(false)
            return { ok: true }
          }}
        />
      ) : null}
    </>
  )
}

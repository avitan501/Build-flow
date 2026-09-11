"use client"

import { REQUEST_GUIDE_STEPS, type requestWorkflowGuidance } from "@/lib/request-workflow-guidance"

export function RequestWorkflowGuide({ guidance }: { guidance: ReturnType<typeof requestWorkflowGuidance> }) {
  function openStep(index: number) {
    const target = document.getElementById(REQUEST_GUIDE_STEPS[index].id)
    if (!target) return
    if (target instanceof HTMLDetailsElement) target.open = true
    target.scrollIntoView({ behavior: "auto", block: "start" })
    target.focus({ preventScroll: true })
  }
  return <section aria-label="Request workflow" className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
    <nav aria-label="Request steps"><ol className="grid grid-cols-3 gap-1">
      {REQUEST_GUIDE_STEPS.map((step, index) => <li key={step.id}>
        <button type="button" onClick={() => openStep(index)} aria-current={guidance.step === index + 1 ? "step" : undefined}
          className={`min-h-11 w-full rounded-lg px-1.5 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${guidance.step === index + 1 ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
          <span className="block text-[10px] opacity-70">{index + 1}</span>{step.label}
        </button>
      </li>)}
    </ol></nav>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <p className="min-w-0 flex-1 basis-44 text-xs leading-5 text-slate-700" role="status"><span className="font-bold">{guidance.waiting ? "Now: " : "Next: "}</span>{guidance.text}</p>
      <button type="button" onClick={() => openStep(guidance.step - 1)} className="min-h-11 rounded-lg border border-sky-200 px-3 text-xs font-bold text-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600">Open step {guidance.step}</button>
    </div>
    <details className="mt-1 text-xs text-slate-600">
      <summary className="w-fit cursor-pointer py-2 font-semibold">New here? See the 3 steps</summary>
      <ol className="list-decimal space-y-2 pl-5 py-2">{REQUEST_GUIDE_STEPS.map(step => <li key={step.id}><strong>{step.label}:</strong> {step.description}</li>)}</ol>
      <p className="pb-2">Choosing suppliers does not send messages. Review recipients before sending.</p>
    </details>
  </section>
}

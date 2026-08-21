"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { deleteProjectQuestionAction, managerUpdateProjectAction, returnRequestToDraftAction, saveProjectQuestionAction, updateRequestStatusAction, updateSupplierPackageAction } from "@/app/preview-admin/workflow-actions"
import { quoteRequestStatusLabel, type ProjectQuestionRecord, type QuoteRequestStatus } from "@/lib/quote-requests"

type PackageRow = { id: string; request_id: string; department: string; supplier_id: string | null; status: string; created_at: string; requestTitle: string; projectName: string }

type ProjectRow = { id: string; name: string; address: string | null; status: "draft" | "active" | "archived"; updated_at: string }
type RequestRow = { id: string; project_id: string; title: string; status: QuoteRequestStatus; updated_at: string; projectName: string }

export function ProjectWorkflowManager({ questions, packages, projects, requests }: { questions: ProjectQuestionRecord[]; packages: PackageRow[]; projects: ProjectRow[]; requests: RequestRow[] }) {
  const router = useRouter()
  const [label, setLabel] = useState("")
  const [type, setType] = useState<ProjectQuestionRecord["question_type"]>("text")
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addQuestion() {
    startTransition(async () => {
      const result = await saveProjectQuestionAction({ label, questionType: type, required, active: true, options: options.split(","), sortOrder: (questions.at(-1)?.sort_order ?? 0) + 10 })
      if (!result.ok) return setMessage(result.error)
      setLabel("")
      setOptions("")
      setRequired(false)
      setMessage("Project question added.")
      router.refresh()
    })
  }

  function removeQuestion(id: string) {
    if (!window.confirm("Remove this project question? Existing answers will also be removed.")) return
    startTransition(async () => {
      const result = await deleteProjectQuestionAction(id)
      if (!result.ok) return setMessage(result.error)
      router.refresh()
    })
  }

  function updatePackage(packageId: string, status: "approved" | "cancelled") {
    startTransition(async () => {
      const result = await updateSupplierPackageAction({ packageId, status })
      if (!result.ok) return setMessage(result.error)
      setMessage(status === "approved" ? "Supplier package approved. Automatic sending remains disabled in preview." : "Supplier package cancelled.")
      router.refresh()
    })
  }

  function returnDraft(requestId: string) {
    startTransition(async () => {
      const result = await returnRequestToDraftAction(requestId)
      if (!result.ok) return setMessage(result.error)
      setMessage("Request returned to Draft.")
      router.refresh()
    })
  }

  function renameProject(project: ProjectRow) {
    const name = window.prompt("Project name", project.name)
    if (!name || name.trim() === project.name) return
    startTransition(async () => {
      const result = await managerUpdateProjectAction({ projectId: project.id, name })
      if (!result.ok) return setMessage(result.error)
      setMessage("Project renamed.")
      router.refresh()
    })
  }

  function toggleProjectArchive(project: ProjectRow) {
    startTransition(async () => {
      const result = await managerUpdateProjectAction({ projectId: project.id, status: project.status === "archived" ? "active" : "archived" })
      if (!result.ok) return setMessage(result.error)
      setMessage(project.status === "archived" ? "Project restored." : "Project archived.")
      router.refresh()
    })
  }

  function updateRequestStatus(requestId: string, status: QuoteRequestStatus) {
    startTransition(async () => {
      const result = await updateRequestStatusAction({ requestId, status })
      if (!result.ok) return setMessage(result.error)
      setMessage("Request status updated.")
      router.refresh()
    })
  }

  return (
    <section className="grid gap-4" id="project-workflow">
      <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Every Project</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Project Questions</h2><p className="mt-1 text-sm text-slate-500">Required questions block the customer’s next submission until answered.</p></div>
        <div className="mt-4 grid gap-2">{questions.map((question) => <div key={question.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><div><p className="text-sm font-semibold text-slate-900">{question.label}</p><p className="text-xs text-slate-500">{question.question_type}{question.required ? " · Required" : " · Optional"}</p></div><button type="button" onClick={() => removeQuestion(question.id)} className="text-sm font-semibold text-rose-600">Remove</button></div>)}</div>
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="New project question" className="min-h-11 rounded-xl border border-slate-300 px-3 text-base sm:col-span-2" />
          <select value={type} onChange={(event) => setType(event.target.value as ProjectQuestionRecord["question_type"])} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"><option value="text">Text</option><option value="textarea">Long text</option><option value="select">Options</option><option value="date">Date</option><option value="time">Time</option></select>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Required</label>
          {type === "select" ? <input value={options} onChange={(event) => setOptions(event.target.value)} placeholder="Options separated by commas" className="min-h-11 rounded-xl border border-slate-300 px-3 sm:col-span-2" /> : null}
          <button type="button" disabled={isPending || !label.trim()} onClick={addQuestion} className="min-h-11 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">Add Project Question</button>
        </div>
      </article>

      <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Request Workflow</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Project Requests</h2><p className="mt-1 text-sm text-slate-500">Move each customer request through the five visible project stages.</p></div>
        <div className="mt-4 grid max-h-[30rem] gap-2 overflow-y-auto">
          {requests.length ? requests.map((request) => (
            <div key={request.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_15rem] sm:items-center">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{request.title}</p><p className="truncate text-xs text-slate-500">{request.projectName} · {quoteRequestStatusLabel(request.status)}</p></div>
              <select value={request.status} disabled={isPending} onChange={(event) => updateRequestStatus(request.id, event.target.value as QuoteRequestStatus)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                <option value="draft">Request Created</option>
                <option value="submitted">Under Review</option>
                <option value="in_review">Waiting for Client Approval</option>
                <option value="quoted">Payment Received · Waiting for Supplier Delivery</option>
                <option value="closed">Request Completed</option>
              </select>
            </div>
          )) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No project requests yet.</p>}
        </div>
      </article>

      <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Clients</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Projects</h2><p className="mt-1 text-sm text-slate-500">Rename, archive, or restore customer projects.</p></div>
        <div className="mt-4 grid max-h-[24rem] gap-2 overflow-y-auto">{projects.length ? projects.map((project) => <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{project.name}</p><p className="truncate text-xs text-slate-500">{project.address || "No address"} · {project.status}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => renameProject(project)} className="text-xs font-semibold text-[#0066cc]">Rename</button><button type="button" onClick={() => toggleProjectArchive(project)} className="text-xs font-semibold text-slate-600">{project.status === "archived" ? "Restore" : "Archive"}</button></div></div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No client projects yet.</p>}</div>
      </article>

      <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Approval Queue</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Supplier Packages</h2><p className="mt-1 text-sm text-slate-500">Nothing sends automatically from this preview.</p></div>
        <div className="mt-4 grid gap-3">{packages.length ? packages.map((pkg) => <div key={pkg.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{pkg.requestTitle}</p><p className="mt-1 text-xs text-slate-500">{pkg.projectName} · {pkg.department} · {pkg.status}</p></div></div>{pkg.status === "pending_approval" ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updatePackage(pkg.id, "approved")} className="min-h-9 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white">Approve Package</button><button type="button" onClick={() => updatePackage(pkg.id, "cancelled")} className="min-h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">Cancel</button><button type="button" onClick={() => returnDraft(pkg.request_id)} className="min-h-9 rounded-full border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-700">Return to Draft</button></div> : null}</div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No submitted supplier packages yet.</p>}</div>
      </article>
      {message ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</div> : null}
    </section>
  )
}

"use client"

import { FileUp, LoaderCircle, ShieldCheck, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { uploadManagerDocumentAction } from "@/app/admin/documents/actions"
import { extractImageTextInBrowser } from "@/lib/browser-document-extraction"

export function ManagerDocumentUpload({ departments, initialDepartment = "Others", initialIntent = "", initiallyOpen = false }: { departments: string[]; initialDepartment?: string; initialIntent?: string; initiallyOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(initiallyOpen)
  const [fileName, setFileName] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setError("")
    startTransition(async () => {
      const file = formData.get("documentFile")
      if (file instanceof File && file.type.startsWith("image/")) {
        try {
          setStatus("Reading visible text on this device…")
          formData.set("browserOcrText", await extractImageTextInBrowser(file, setStatus))
        } catch { formData.set("browserOcrText", "") }
      }
      setStatus("Original saved. Classifying and checking the document…")
      const result = await uploadManagerDocumentAction(formData)
      if (!result.ok) { setStatus(""); setError(result.error); return }
      router.push(`/admin/documents/${result.data.documentId}`)
    })
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white shadow-sm"><FileUp className="h-4 w-4" /> Upload document</button>
  return <section id="document-upload" className="w-full scroll-mt-6 border border-slate-200 bg-white shadow-sm xl:max-w-2xl" aria-labelledby="document-upload-title">
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0071e3]">Private intake</p><h2 id="document-upload-title" className="mt-1 text-lg font-bold">Upload once</h2><p className="mt-1 text-xs text-slate-500">AI prepares a review. Nothing is routed until you approve it.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close upload" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200"><X className="h-4 w-4" /></button></div>
    <form action={submit} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      <input type="hidden" name="intent" value={initialIntent} />
      <input type="hidden" name="sourceChannel" value="website_upload" />
      <input type="hidden" name="sourceLabel" value="Website upload" />
      <label className="grid gap-1.5 text-sm font-semibold">Starting department<select name="department" defaultValue={initialDepartment} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900"><ShieldCheck className="h-4 w-4 shrink-0" />Private original · no automatic posting</div>
      <label className="sm:col-span-2"><span className="flex min-h-28 cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-700 hover:border-[#0071e3] hover:bg-sky-50"><FileUp className="h-5 w-5 text-[#0071e3]" />{fileName || "Choose PDF, CSV, TXT, or image · 25 MB maximum"}</span><input name="documentFile" type="file" required accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,text/plain,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label>
      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p> : null}
      {status ? <p role="status" className="text-xs font-semibold text-[#0071e3] sm:col-span-2">{status}</p> : null}
      <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={pending || !fileName} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-40">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Reading safely…</> : <>Save and prepare review <FileUp className="h-4 w-4" /></>}</button></div>
    </form>
  </section>
}

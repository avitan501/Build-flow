"use client"

import { AlertTriangle, Bug, CheckCircle2, ClipboardCheck, FileImage, Film, LoaderCircle, Save, Trash2, Upload, Wrench, XCircle } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { completeWebsiteDefectUploadsAction, prepareWebsiteDefectUploadsAction, recordWebsiteQaCheckAction, updateWebsiteDefectAction } from "@/app/admin/ai-tools/website-defects/actions"
import { createClient } from "@/lib/supabase/client"
import { normalizeWebsiteDefectFileType, retryWebsiteDefectUpload, validateWebsiteDefectFiles, WEBSITE_DEFECT_MAX_FILES, websiteDefectDeploymentIsStale, websiteDefectUploadErrorMessage, websiteDefectUploadErrorStatus } from "@/lib/website-defect-upload"

const STATUS_OPTIONS = [
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["fixing", "Fixing"],
  ["ready_to_verify", "Ready to verify"],
  ["resolved", "Resolved"],
] as const

export type WebsiteDefectRecord = {
  id: string
  issueNumber: number
  title: string
  description: string
  pageUrl: string
  status: string
  priority: string
  fileName: string
  mimeType: string
  fileSize: number
  mediaUrl: string | null
  assignedTo: string
  reviewNotes: string
  createdAt: string
  attachments?: WebsiteDefectAttachmentRecord[]
}

export type WebsiteDefectAttachmentRecord = {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  mediaUrl: string | null
}

export type WebsiteQaCheckRecord = {
  id: string
  title: string
  instructions: string
  lastResult: string
  lastNotes: string
  lastCheckedAt: string | null
}

function statusClass(status: string) {
  if (status === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "ready_to_verify") return "border-sky-200 bg-sky-50 text-sky-800"
  if (status === "fixing") return "border-amber-200 bg-amber-50 text-amber-900"
  if (status === "reviewing") return "border-violet-200 bg-violet-50 text-violet-800"
  return "border-slate-200 bg-white text-slate-800"
}

function DefectCard({ issue, canManage }: { issue: WebsiteDefectRecord; canManage: boolean }) {
  const router = useRouter()
  const affectedPageUrl = /^https?:\/\//i.test(issue.pageUrl) ? issue.pageUrl : ""
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description)
  const [pageUrl, setPageUrl] = useState(issue.pageUrl)
  const [reviewNotes, setReviewNotes] = useState(issue.reviewNotes)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const media = [{ id: `${issue.id}:primary`, fileName: issue.fileName, mimeType: issue.mimeType, fileSize: issue.fileSize, mediaUrl: issue.mediaUrl }, ...(issue.attachments ?? [])]

  function update(fields: Omit<Parameters<typeof updateWebsiteDefectAction>[0], "id">) {
    setMessage("")
    startTransition(async () => {
      const result = await updateWebsiteDefectAction({ id: issue.id, ...fields })
      setMessage(result.ok ? "Saved." : result.error)
      if (result.ok) router.refresh()
    })
  }

  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.07)]">
    <div className="grid lg:grid-cols-[minmax(20rem,.95fr)_minmax(0,1.05fr)]">
      <div className={`relative grid min-h-64 gap-px bg-slate-800 ${media.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {media.map((file, index) => <div key={file.id} className="relative grid min-h-64 place-items-center bg-slate-950">
          {file.mediaUrl ? file.mimeType.startsWith("video/") ? <video src={file.mediaUrl} controls playsInline preload="metadata" className="h-full max-h-[34rem] min-h-64 w-full bg-black object-contain" /> : <a href={file.mediaUrl} target="_blank" rel="noreferrer" className="grid h-full w-full place-items-center"><Image src={file.mediaUrl} alt={`${issue.title} — file ${index + 1}`} width={1200} height={900} unoptimized className="h-full max-h-[34rem] min-h-64 w-full object-contain" /></a> : <div className="grid min-h-64 place-items-center px-4 text-center text-sm font-bold text-white/70">Private preview unavailable</div>}
          {media.length > 1 ? <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-black/75 px-2 py-1 text-[10px] font-bold text-white">{index + 1}/{media.length} · {file.fileName}</span> : null}
        </div>)}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur"><Bug className="h-3.5 w-3.5" />Issue #{issue.issueNumber}</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{issue.mimeType.startsWith("video/") ? <Film className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}<span className="max-w-52 truncate">{issue.fileName}</span><span>{(issue.fileSize / 1024 / 1024).toFixed(1)} MB</span></div>
          {canManage ? <div className="flex gap-2"><select aria-label={`Priority for issue ${issue.issueNumber}`} defaultValue={issue.priority} disabled={pending} onChange={(event) => update({ priority: event.target.value })} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><select aria-label={`Status for issue ${issue.issueNumber}`} defaultValue={issue.status} disabled={pending} onChange={(event) => update({ status: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs font-bold ${statusClass(issue.status)}`}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div> : <span className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${statusClass(issue.status)}`}>{STATUS_OPTIONS.find(([value]) => value === issue.status)?.[1] ?? issue.status}</span>}
        </div>
        {canManage ? <><label className="mt-4 grid gap-1 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">Issue title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold normal-case tracking-normal text-slate-950" /></label><label className="mt-3 grid gap-1 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">What is wrong<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={4} placeholder="Write normally—even a few rough words are enough." className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-slate-900" /></label><label className="mt-3 grid gap-1 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">Page URL <span className="font-normal normal-case tracking-normal">(optional)</span><input value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} maxLength={1000} placeholder="https://build.avantiap.com/..." className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-900" /></label><label className="mt-3 grid gap-1 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">Codex review / fix notes<textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} maxLength={4000} rows={2} placeholder="What was found, changed, or still needs verification." className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-slate-900" /></label></> : <div className="mt-4 space-y-3"><div><h3 className="text-sm font-bold text-slate-950">{issue.title}</h3>{issue.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{issue.description}</p> : null}</div>{affectedPageUrl ? <a href={affectedPageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-xs font-bold text-[#0066cc] underline underline-offset-4">Open affected page</a> : null}{issue.reviewNotes ? <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">Review notes</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{issue.reviewNotes}</p></div> : null}</div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">Assigned to <strong className="text-slate-800">{issue.assignedTo}</strong> · {new Date(issue.createdAt).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET</p>{canManage ? <button type="button" disabled={pending || title.trim().length < 2} onClick={() => update({ title, description, pageUrl, reviewNotes })} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white disabled:opacity-40">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save issue</button> : null}</div>
        {message ? <p role="status" className={`mt-2 text-xs font-bold ${message === "Saved." ? "text-emerald-700" : "text-rose-700"}`}>{message}</p> : null}
      </div>
    </div>
  </article>
}

function QaCheckCard({ check, canManage }: { check: WebsiteQaCheckRecord; canManage: boolean }) {
  const router = useRouter()
  const [notes, setNotes] = useState(check.lastNotes)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  function record(result: "pass" | "fail" | "blocked") {
    setMessage("")
    startTransition(async () => {
      const response = await recordWebsiteQaCheckAction({ id: check.id, result, notes })
      setMessage(response.ok ? "Test saved." : response.error)
      if (response.ok) router.refresh()
    })
  }
  const resultStyle = check.lastResult === "pass" ? "bg-emerald-50 text-emerald-800" : check.lastResult === "fail" ? "bg-rose-50 text-rose-800" : check.lastResult === "blocked" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-600"
  const resultLabel = check.lastResult === "not_tested" ? "Not tested" : check.lastResult.charAt(0).toUpperCase() + check.lastResult.slice(1)
  return <article className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-950">{check.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{check.instructions}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${resultStyle}`}>{resultLabel}</span></div>
    <p className="mt-3 text-[11px] font-semibold text-slate-500">Last checked: {check.lastCheckedAt ? `${new Date(check.lastCheckedAt).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET` : "Never"}</p>
    {canManage ? <><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={2000} placeholder="What did you test or notice?" className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs leading-5" /><div className="mt-2 grid grid-cols-3 gap-2"><button type="button" disabled={pending} onClick={() => record("pass")} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" />Passed</button><button type="button" disabled={pending} onClick={() => record("fail")} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-rose-600 px-2 text-xs font-bold text-white"><XCircle className="h-3.5 w-3.5" />Failed</button><button type="button" disabled={pending} onClick={() => record("blocked")} className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-2 text-xs font-bold text-amber-900">Blocked</button></div></> : check.lastNotes ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{check.lastNotes}</p> : null}
    {message ? <p role="status" className="mt-2 text-[11px] font-bold text-slate-600">{message}</p> : null}
  </article>
}

export function WebsiteDefectInbox({ issues, checks, canManage }: { issues: WebsiteDefectRecord[]; checks: WebsiteQaCheckRecord[]; canManage: boolean }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [staleDeployment, setStaleDeployment] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    if (!files.length || pending) return
    setMessage("")
    setIsError(false)
    const validationError = validateWebsiteDefectFiles(files)
    if (validationError) { setIsError(true); setMessage(validationError); return }
    startTransition(async () => {
      try {
        if (await websiteDefectDeploymentIsStale()) {
          setStaleDeployment(true)
          setIsError(true)
          setMessage("A newer website version is ready. Open it in a new tab and choose these files there. This tab will stay open as your reference.")
          return
        }
        const normalizedFiles = files.map((file) => ({ file, fileName: file.name, fileType: normalizeWebsiteDefectFileType(file), fileSize: file.size }))
        setMessage(`Preparing ${files.length} private ${files.length === 1 ? "upload" : "uploads"}…`)
        const prepared = await prepareWebsiteDefectUploadsAction({ files: normalizedFiles.map(({ fileName, fileType, fileSize }) => ({ fileName, fileType, fileSize })) })
        if (!prepared.ok) { setIsError(true); setMessage(prepared.error); return }
        if (prepared.data.uploads.length !== normalizedFiles.length) {
          setIsError(true)
          setMessage("The secure upload list did not match your selected files. Nothing was submitted.")
          return
        }
        for (let index = 0; index < normalizedFiles.length; index += 1) {
          const selected = normalizedFiles[index]
          const target = prepared.data.uploads[index]
          if (!target || target.fileType !== selected.fileType || target.fileSize !== selected.fileSize) {
            setIsError(true)
            setMessage("The secure upload list did not match your selected files. Nothing was submitted.")
            return
          }
          const uploadBody = selected.file.type.trim().toLowerCase() === selected.fileType ? selected.file : selected.file.slice(0, selected.file.size, selected.fileType)
          let uploadError: unknown = null
          for (let attempt = 0; attempt < 2; attempt += 1) {
            setMessage(attempt === 0 ? `Uploading file ${index + 1} of ${files.length}…` : `Connection interrupted—retrying file ${index + 1} of ${files.length}…`)
            const result = await createClient().storage.from("website-defects").uploadToSignedUrl(target.filePath, target.token, uploadBody, { contentType: selected.fileType, upsert: false })
            uploadError = result.error
            if (!uploadError) break
            const status = websiteDefectUploadErrorStatus(uploadError)
            console.warn("Website defect upload attempt failed", { file: index + 1, attempt: attempt + 1, status })
            if (attempt > 0 && status === 409) break
            if (attempt > 0 || !retryWebsiteDefectUpload(uploadError)) {
              setIsError(true)
              setMessage(`File ${index + 1} of ${files.length}: ${websiteDefectUploadErrorMessage(uploadError)}`)
              return
            }
          }
          if (uploadError && websiteDefectUploadErrorStatus(uploadError) !== 409) {
            setIsError(true)
            setMessage(`File ${index + 1} of ${files.length}: ${websiteDefectUploadErrorMessage(uploadError)}`)
            return
          }
        }
        setMessage("Creating the issue…")
        const completed = await completeWebsiteDefectUploadsAction({ defectId: prepared.data.defectId, files: prepared.data.uploads.map(({ fileName, fileType, fileSize, filePath }) => ({ fileName, fileType, fileSize, filePath })), title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? ""), pageUrl: String(formData.get("pageUrl") ?? ""), priority: String(formData.get("priority") ?? "normal") })
        if (!completed.ok) { setIsError(true); setMessage(completed.error); return }
        setFiles([])
        setMessage(`Issue #${completed.data.issueNumber} created with ${files.length} ${files.length === 1 ? "file" : "files"}. Codex can now review it.`)
        router.refresh()
      } catch (cause) {
        console.error("Website defect upload failed", cause)
        setIsError(true)
        setMessage("The upload stopped. Your page is safe—please try again.")
      }
    })
  }

  const openCount = issues.filter((issue) => issue.status !== "resolved").length
  return <div>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-[0_22px_70px_rgba(15,23,42,.18)]">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-sky-300"><AlertTriangle className="h-3.5 w-3.5" />Private issue inbox</span><h1 className="mt-4 text-2xl font-bold tracking-[-.04em] sm:text-3xl">Show the problem. We track the fix.</h1><p className="mt-2 max-w-md text-sm leading-6 text-slate-300">Upload up to 6 recordings or screenshots for one problem. Rough notes are fine.</p><div className="mt-4 flex gap-3 text-xs font-bold"><span className="rounded-lg bg-white/10 px-3 py-2">{openCount} open</span><span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-emerald-300">{issues.length - openCount} resolved</span></div></div>
        <form action={submit} className="rounded-xl border border-white/10 bg-white p-4 text-slate-950 shadow-2xl sm:p-5">
          <label className="grid gap-1 text-xs font-bold">Short title <span className="font-normal text-slate-400">(optional)</span><input name="title" maxLength={160} placeholder="Example: Add item button does nothing" className="h-11 rounded-lg border border-slate-300 px-3 text-sm" /></label>
          <label className="mt-3 grid gap-1 text-xs font-bold">What happened? <span className="font-normal text-slate-400">Write normally or leave a few words.</span><textarea name="description" maxLength={4000} rows={3} placeholder="I clicked Add item and nothing opened…" className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6" /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]"><label className="grid gap-1 text-xs font-bold">Page URL <span className="font-normal text-slate-400">(optional)</span><input name="pageUrl" type="url" placeholder="Paste the page link" className="h-11 min-w-0 rounded-lg border border-slate-300 px-3 text-sm" /></label><label className="grid gap-1 text-xs font-bold">Priority<select name="priority" className="h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div>
          <label className={`mt-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-[border-color,background-color] ${files.length ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50"}`}><Upload className="h-6 w-6 text-[#0071e3]" /><strong className="mt-2 text-sm">{files.length ? `${files.length} ${files.length === 1 ? "file" : "files"} selected` : "Choose videos or screenshots"}</strong><span className="mt-1 text-xs text-slate-500">Up to {WEBSITE_DEFECT_MAX_FILES} files · 100 MB each · 250 MB total</span><input type="file" multiple accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" disabled={pending || files.length >= WEBSITE_DEFECT_MAX_FILES} className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files ?? []); const existing = new Set(files.map((file) => `${file.name}:${file.size}:${file.lastModified}`)); const next = [...files, ...selected.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`))]; const error = validateWebsiteDefectFiles(next); if (error) { setIsError(true); setMessage(error) } else { setFiles(next); setMessage(""); setIsError(false) } event.currentTarget.value = "" }} /></label>
          {files.length ? <ul aria-label="Selected issue files" className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">{files.map((file, index) => <li key={`${file.name}:${file.size}:${file.lastModified}`} className="flex min-h-11 items-center gap-2 px-3 py-2"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{file.name}</span><span className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span></span><button type="button" disabled={pending} onClick={() => { setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)); setMessage(""); setIsError(false) }} aria-label={`Remove ${file.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : null}
          {staleDeployment ? <a href="/admin/ai-tools/website-defects" target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white"><Upload className="h-4 w-4" />Open latest version</a> : <button type="submit" disabled={!files.length || pending} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white disabled:bg-slate-300">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}{pending ? "Saving the issue…" : isError ? "Try upload again" : files.length ? `Upload ${files.length} ${files.length === 1 ? "file" : "files"} and create issue` : "Choose files to continue"}</button>}
          {message ? <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}
        </form>
      </div>
    </section>
    <section className="mt-6"><div className="flex items-end justify-between gap-3"><div><h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-950"><ClipboardCheck className="h-4 w-4 text-[#0066cc]" />Required website checks</h2><p className="mt-1 text-xs text-slate-500">{canManage ? "Run each journey and save the result." : "Review the latest owner-verified results."}</p></div><span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600">{checks.filter((check) => check.lastResult === "pass").length}/{checks.length} passed</span></div><div className="mt-3 grid gap-3 md:grid-cols-2">{checks.map((check) => <QaCheckCard key={check.id} check={check} canManage={canManage} />)}</div></section>
    <div className="mt-6 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Defect queue</p><h2 className="mt-1 text-xl font-bold text-slate-950">Website issues</h2></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Wrench className="h-4 w-4" />Newest first</span></div>
    <section className="mt-3 grid gap-4">{issues.length ? issues.map((issue) => <DefectCard key={issue.id} issue={issue} canManage={canManage} />) : <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-center"><div><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm font-bold text-slate-900">No website issues yet</p><p className="mt-1 text-xs text-slate-500">Your first upload will appear here as Issue #1.</p></div></div>}</section>
  </div>
}

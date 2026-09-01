"use client"

import { FileUp, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { addRequestAttachmentsAction, type ExistingRequestUploadInput } from "@/app/owner/materials/requests/actions"
import { createClient } from "@/lib/supabase/client"
import { getSupabasePublicEnv } from "@/lib/supabase/env"

const MAX_FILES = 10
const MAX_FILE_SIZE = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])

export function RequestAttachmentUploader({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [pending, startTransition] = useTransition()

  function showError(value: string) {
    setMessage(value)
    setIsError(true)
  }

  function chooseFiles(selected: File[]) {
    const next = [...files, ...selected]
    if (next.length > MAX_FILES) return showError(`Add up to ${MAX_FILES} files at a time.`)
    const unsupported = next.find((file) => !ALLOWED_TYPES.has(file.type))
    if (unsupported) return showError(`${unsupported.name} is not supported. Add a PDF, JPG, PNG, or WebP file.`)
    const oversized = next.find((file) => file.size > MAX_FILE_SIZE)
    if (oversized) return showError(`${oversized.name} is too large. Keep each file under 25 MB.`)
    setFiles(next)
    setMessage("")
    setIsError(false)
  }

  async function uploadFile(file: File): Promise<ExistingRequestUploadInput> {
    const { url, anonKey } = getSupabasePublicEnv()
    const response = await fetch(`${url}/functions/v1/public-quote-intake`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
      body: JSON.stringify({ action: "prepare_upload", filename: file.name, type: file.type, size: file.size }),
    })
    const prepared = await response.json().catch(() => null) as { path?: string; token?: string; error?: string } | null
    if (!response.ok || !prepared?.path || !prepared.token) throw new Error(prepared?.error || `Could not prepare ${file.name}.`)
    const { error } = await createClient().storage.from("project-uploads").uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(`Could not upload ${file.name}. Please try again.`)
    return { storagePath: prepared.path, filename: file.name, type: file.type, size: file.size }
  }

  function attachFiles() {
    if (!files.length) return
    setMessage("")
    startTransition(async () => {
      try {
        const uploads = await Promise.all(files.map(uploadFile))
        const result = await addRequestAttachmentsAction({ requestId, attachments: uploads })
        if (!result.ok) return showError(result.error)
        setFiles([])
        setIsError(false)
        setMessage(`${uploads.length} file${uploads.length === 1 ? "" : "s"} attached to this request.`)
        router.refresh()
      } catch (cause) {
        showError(cause instanceof Error ? cause.message : "The files could not be attached. Please try again.")
      }
    })
  }

  return <section className="mt-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3" aria-label="Add files to request">
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-sky-300 bg-white px-4 text-sm font-bold text-[#0066cc]"><FileUp className="h-4 w-4" />Add documents or photos<input type="file" accept="image/jpeg,image/png,image/webp,.pdf" multiple className="sr-only" onChange={(event) => { chooseFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = "" }} /></label>
      {files.length ? <button type="button" onClick={attachFiles} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-50">{pending ? "Attaching..." : `Attach ${files.length} to request`}</button> : null}
    </div>
    <p className="mt-1.5 text-xs text-slate-500">Add files at any time—even after the request was created.</p>
    {files.length ? <div className="mt-2 flex flex-wrap gap-1.5">{files.map((file, index) => <span key={`${file.name}-${file.lastModified}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded"><X className="h-3.5 w-3.5" /></button></span>)}</div> : null}
    {message ? <p role="status" className={`mt-2 text-xs font-bold ${isError ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
  </section>
}

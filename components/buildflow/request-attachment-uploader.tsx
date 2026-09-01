"use client"

import { FileUp, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { addRequestAttachmentsAction, type ExistingRequestUploadInput } from "@/app/owner/materials/requests/actions"
import { createClient } from "@/lib/supabase/client"
import { getSupabasePublicEnv } from "@/lib/supabase/env"

const MAX_FILES = 10
const MAX_FILE_SIZE = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])

export function RequestAttachmentUploader({ requestId, compact = false }: { requestId: string; compact?: boolean }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [pending, startTransition] = useTransition()

  function showError(value: string) {
    setMessage(value)
    setIsError(true)
  }

  function validateFiles(selected: File[]) {
    if (selected.length > MAX_FILES) return `Add up to ${MAX_FILES} files at a time.`
    const unsupported = selected.find((file) => !ALLOWED_TYPES.has(file.type))
    if (unsupported) return `${unsupported.name} is not supported. Add a PDF, JPG, PNG, or WebP file.`
    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE)
    if (oversized) return `${oversized.name} is too large. Keep each file under 25 MB.`
    return ""
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

  function attachFiles(files: File[]) {
    if (!files.length || pending) return
    const validationError = validateFiles(files)
    if (validationError) return showError(validationError)
    setMessage("")
    startTransition(async () => {
      try {
        const uploads = await Promise.all(files.map(uploadFile))
        const result = await addRequestAttachmentsAction({ requestId, attachments: uploads })
        if (!result.ok) return showError(result.error)
        setIsError(false)
        setMessage(`${uploads.length} file${uploads.length === 1 ? "" : "s"} attached to this request.`)
        router.refresh()
      } catch (cause) {
        showError(cause instanceof Error ? cause.message : "The files could not be attached. Please try again.")
      }
    })
  }

  return <section className={compact ? "p-3" : "mt-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3"} aria-label="Add files to request">
    <div className="flex flex-wrap items-center gap-2">
      <label className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-300 bg-white px-4 text-sm font-bold text-[#0066cc] ${pending ? "cursor-wait opacity-60" : "cursor-pointer"}`}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{pending ? "Uploading and attaching…" : "Add documents or photos"}<input type="file" accept="image/jpeg,image/png,image/webp,.pdf" multiple disabled={pending} className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files ?? []); event.currentTarget.value = ""; attachFiles(selected) }} /></label>
    </div>
    {message ? <p role="status" className={`mt-2 text-xs font-bold ${isError ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
  </section>
}

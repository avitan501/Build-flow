"use client"

import { CheckCircle2, FileUp, LoaderCircle, Send, X } from "lucide-react"
import { useActionState, useRef, useState, useTransition } from "react"

import { submitQuoteRequestFormAction, type QuoteRequestFormState } from "@/app/request-quote/actions"
import { createClient } from "@/lib/supabase/client"
import { getSupabasePublicEnv } from "@/lib/supabase/env"

const initialState: QuoteRequestFormState = { status: "idle", message: "" }
const directAttachmentSize = 4 * 1024 * 1024
const maxAttachmentSize = 25 * 1024 * 1024
const inputClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100"

function SubmitButton({ pending, beatQuote }: { pending: boolean; beatQuote: boolean }) {
  return <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white transition hover:bg-[#0068d1] disabled:cursor-wait disabled:opacity-65">
    {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
    {pending ? "Sending..." : beatQuote ? "Send quote" : "Send request"}
  </button>
}

export function QuoteRequestForm({ mode = "request", defaultDepartment, defaultMaterialDetails }: { mode?: "request" | "beat"; defaultDepartment?: string; defaultMaterialDetails?: string }) {
  const beatQuote = mode === "beat"
  const [state, formAction, pending] = useActionState(submitQuoteRequestFormAction, initialState)
  const [uploadPending, startUploadTransition] = useTransition()
  const [fileError, setFileError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState("")
  const attachmentRef = useRef<HTMLInputElement>(null)

  function validateAttachment(file: File | undefined) {
    if (!file || file.size <= maxAttachmentSize) {
      setFileError("")
      setSelectedFileName(file?.name || "")
      return true
    }

    setSelectedFileName(file.name)
    setFileError("This file is too large. Choose a smaller file or remove it.")
    return false
  }

  async function uploadLargeAttachment(file: File) {
    const { url, anonKey } = getSupabasePublicEnv()
    const response = await fetch(`${url}/functions/v1/public-quote-intake`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "prepare_upload", filename: file.name, type: file.type, size: file.size }),
    })
    const prepared = (await response.json().catch(() => null)) as { path?: string; token?: string; error?: string } | null
    if (!response.ok || !prepared?.path || !prepared.token) throw new Error(prepared?.error || "Could not prepare the file upload.")

    const { error: uploadError } = await createClient().storage
      .from("project-uploads")
      .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false })
    if (uploadError) throw new Error("Could not upload the attachment. Please try again.")
    return prepared.path
  }

  function removeAttachment() {
    if (attachmentRef.current) attachmentRef.current.value = ""
    setSelectedFileName("")
    setFileError("")
  }

  if (state.status === "success") {
    return <section className="border-y border-emerald-200 bg-emerald-50 px-5 py-9 text-center sm:rounded-lg sm:border" role="status">
      <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-700" />
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">Request received</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700">{state.message}</p>
      {state.referenceId ? <p className="mt-2 text-sm font-semibold text-emerald-800">Reference: {state.referenceId}</p> : null}
      <a href={beatQuote ? "/beat-a-quote" : "/request-quote"} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-900">{beatQuote ? "Upload another quote" : "Send another request"}</a>
    </section>
  }

  return <form
    id="request-form"
    action={formAction}
    onSubmit={(event) => {
      const file = attachmentRef.current?.files?.[0]
      if (!validateAttachment(file)) {
        event.preventDefault()
        return
      }
      if (!file || file.size <= directAttachmentSize) return

      event.preventDefault()
      const submission = new FormData(event.currentTarget)
      submission.delete("attachment")
      setFileError("")
      setUploading(true)
      void uploadLargeAttachment(file)
        .then((storagePath) => {
          submission.set("attachmentPath", storagePath)
          submission.set("attachmentName", file.name)
          submission.set("attachmentType", file.type)
          submission.set("attachmentSize", String(file.size))
          setUploading(false)
          startUploadTransition(() => formAction(submission))
        })
        .catch((cause) => {
          setUploading(false)
          setFileError(cause instanceof Error ? cause.message : "Could not upload the attachment. Please try again.")
        })
    }}
    className="border-y border-slate-200 bg-white px-4 py-5 sm:rounded-lg sm:border sm:p-6 sm:shadow-sm"
    data-testid="quote-request-form"
  >
    <input type="hidden" name="requestKind" value={beatQuote ? "beat_quote" : "quote_request"} />
    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
    {defaultDepartment ? <input type="hidden" name="departments" value={defaultDepartment} /> : null}

    <div className="grid grid-cols-2 gap-2">
      <label><span className="sr-only">Full name</span><input aria-label="Full name" name="fullName" required autoComplete="name" placeholder="Full name" className={inputClass} /></label>
      <label><span className="sr-only">Company</span><input aria-label="Company" name="company" autoComplete="organization" placeholder="Company (optional)" className={inputClass} /></label>
      <label><span className="sr-only">Email</span><input aria-label="Email" name="email" required type="email" autoComplete="email" placeholder="Email" className={inputClass} /></label>
      <label><span className="sr-only">Phone</span><input aria-label="Phone" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone" className={inputClass} /></label>
    </div>

    <label className="mt-4 block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-900">{beatQuote ? "Anything we should know?" : "What do you need?"}</span>
      <textarea name="details" rows={4} maxLength={5000} defaultValue={defaultMaterialDetails} placeholder={beatQuote ? "Optional notes" : "Paste your list or request any item. We’ll look for it."} className={`${inputClass} h-auto min-h-24 resize-y py-2.5`} />
    </label>

    <div className="mt-3 flex min-w-0 items-center gap-2">
      <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-[#0071e3]">
        <FileUp className="h-4 w-4 text-[#0071e3]" />{selectedFileName ? "Change file" : beatQuote ? "Add quote" : "Add file"}
        <input ref={attachmentRef} aria-label={beatQuote ? "Attach the supplier quote" : "Attach a plan or material list"} type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => validateAttachment(event.currentTarget.files?.[0])} className="sr-only" />
      </label>
      {selectedFileName ? <><span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{selectedFileName}</span><button type="button" onClick={removeAttachment} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Remove file"><X className="h-4 w-4" /></button></> : <span className="truncate text-xs text-slate-500">{beatQuote ? "Required" : "PDF, photo, or blueprint"}</span>}
    </div>

    <fieldset className="mt-4">
      <legend className="text-xs font-semibold text-slate-600">Reply by</legend>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
        {["WhatsApp", "Text", "Call", "Email"].map((method) => <label key={method} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700"><input type="checkbox" name="contactMethods" value={method} defaultChecked={method === "WhatsApp"} className="h-4 w-4 rounded accent-[#0071e3]" />{method}</label>)}
      </div>
    </fieldset>

    {fileError ? <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800" role="alert"><p>{fileError}</p><button type="button" onClick={removeAttachment} className="mt-2 min-h-9 rounded-md border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800">Remove file</button></div> : null}
    {uploading ? <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900" role="status">Uploading...</p> : null}
    {state.status === "error" ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800" role="alert">{state.message}</p> : null}

    <div className="mt-4"><SubmitButton pending={pending || uploadPending || uploading} beatQuote={beatQuote} /></div>
  </form>
}

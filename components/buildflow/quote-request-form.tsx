"use client"

import { CheckCircle2, FileUp, LocateFixed, LoaderCircle, Send } from "lucide-react"
import { useActionState, useRef, useState, useTransition } from "react"

import { submitQuoteRequestFormAction, type QuoteRequestFormState } from "@/app/request-quote/actions"
import { createClient } from "@/lib/supabase/client"
import { getSupabasePublicEnv } from "@/lib/supabase/env"

const initialState: QuoteRequestFormState = { status: "idle", message: "" }
const departments = ["Framing", "Flooring", "Sheet rock", "Tile work", "Door and molding", "Siding", "Roofing", "Windows"]
const directAttachmentSize = 4 * 1024 * 1024
const maxAttachmentSize = 25 * 1024 * 1024
const inputClass = "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
const labelClass = "grid gap-1.5 text-sm font-semibold text-slate-800"

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white transition hover:bg-[#0068d1] disabled:cursor-wait disabled:opacity-65 sm:w-auto">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {pending ? "Sending request..." : "Send quote request"}
    </button>
  )
}

export function QuoteRequestForm() {
  const [state, formAction, pending] = useActionState(submitQuoteRequestFormAction, initialState)
  const [uploadPending, startUploadTransition] = useTransition()
  const [address, setAddress] = useState("")
  const [locationStatus, setLocationStatus] = useState("")
  const [locating, setLocating] = useState(false)
  const [fileError, setFileError] = useState("")
  const [uploading, setUploading] = useState(false)
  const attachmentRef = useRef<HTMLInputElement>(null)

  function validateAttachment(file: File | undefined) {
    if (!file || file.size <= maxAttachmentSize) {
      setFileError("")
      return true
    }

    const size = (file.size / (1024 * 1024)).toFixed(1)
    setFileError(`This file is ${size} MB. The maximum upload size is 25 MB. Choose a smaller file or remove it to send the request without an attachment.`)
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
    setFileError("")
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this device.")
      return
    }

    setLocating(true)
    setLocationStatus("Finding your address...")
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`/api/location/reverse?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`)
        const result = (await response.json().catch(() => null)) as { address?: string; error?: string } | null
        if (!response.ok || !result?.address) throw new Error(result?.error || "Address not found.")
        setAddress(result.address)
        setLocationStatus("Address filled in.")
      } catch (cause) {
        setLocationStatus(cause instanceof Error ? cause.message : "We could not find the address. Please type it instead.")
      } finally {
        setLocating(false)
      }
    }, () => {
      setLocating(false)
      setLocationStatus("Location permission was not available. Please type the address instead.")
    }, { enableHighAccuracy: true, timeout: 12_000 })
  }

  if (state.status === "success") {
    return (
      <section className="border-y border-emerald-200 bg-emerald-50 px-5 py-10 text-center sm:px-8" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
        <h2 className="mt-4 text-2xl font-semibold text-slate-950">Request received</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700">{state.message}</p>
        {state.referenceId ? <p className="mt-3 text-sm font-semibold text-emerald-800">Reference: {state.referenceId}</p> : null}
        <a href="/request-quote" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-900">Start another request</a>
      </section>
    )
  }

  return (
    <form
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
      className="overflow-hidden border-y border-slate-200 bg-white"
      data-testid="quote-request-form"
    >
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />

      <fieldset className="grid gap-4 border-b border-slate-200 px-5 py-6 sm:grid-cols-2 sm:px-8 sm:py-8">
        <legend className="w-full px-5 pt-6 text-xl font-semibold text-slate-950 sm:px-8 sm:pt-8">1. Contact information</legend>
        <label className={`${labelClass} sm:col-span-2`}>Full name<input name="fullName" required autoComplete="name" placeholder="First and last name" className={inputClass} /></label>
        <label className={labelClass}>Email<input name="email" required type="email" autoComplete="email" className={inputClass} /></label>
        <label className={labelClass}>Phone <span className="font-normal text-slate-500">Optional</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} /></label>
        <label className={labelClass}>Company <span className="font-normal text-slate-500">Optional</span><input name="company" autoComplete="organization" className={inputClass} /></label>
      </fieldset>

      <fieldset className="grid gap-4 border-b border-slate-200 px-5 py-6 sm:grid-cols-2 sm:px-8 sm:py-8">
        <legend className="w-full px-5 pt-6 text-xl font-semibold text-slate-950 sm:px-8 sm:pt-8">2. Project information</legend>
        <label className={labelClass}>Project name <span className="font-normal text-slate-500">Optional</span><input name="projectName" placeholder="Example: 123 Main Street renovation" className={inputClass} /></label>
        <div className={`${labelClass} sm:col-span-2`}>
          <label htmlFor="quote-address">Job-site address <span className="font-normal text-slate-500">Optional</span></label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input id="quote-address" name="address" value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" placeholder="Start typing or use your current location" className={inputClass} />
            <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-60">
              {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {locating ? "Finding..." : "Use current location"}
            </button>
          </div>
          {locationStatus ? <p className="text-xs font-normal text-slate-500" role="status">{locationStatus}</p> : null}
        </div>
        <label className={`${labelClass} sm:col-span-2`}>When are materials needed? <span className="font-normal text-slate-500">Optional</span><select name="timeframe" defaultValue="" className={inputClass}><option value="">Not sure yet</option><option>As soon as possible</option><option>Within 1-2 weeks</option><option>Within 1 month</option><option>Within 1-3 months</option><option>Planning for later</option></select></label>
      </fieldset>

      <fieldset className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8">
        <legend className="w-full px-5 pt-6 text-xl font-semibold text-slate-950 sm:px-8 sm:pt-8">3. What do you need?</legend>
        <div>
          <p className="text-sm font-semibold text-slate-800">Choose relevant departments <span className="font-normal text-slate-500">Optional</span></p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {departments.map((department) => <label key={department} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-900"><input type="checkbox" name="departments" value={department} className="h-4 w-4 accent-[#0071e3]" />{department}</label>)}
          </div>
        </div>
        <label className={labelClass}>Project details or material list <span className="font-normal text-slate-500">Optional when attaching a file</span><textarea name="details" rows={5} maxLength={5000} placeholder="Tell us what you need, or attach your plan or list below." className={`${inputClass} min-h-32 resize-y py-3`} /></label>
        <label className="grid cursor-pointer gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 transition hover:border-sky-400 hover:bg-sky-50">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><FileUp className="h-5 w-5 text-[#0071e3]" />Attach a plan or material list <span className="font-normal text-slate-500">Optional</span></span>
          <input ref={attachmentRef} type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => validateAttachment(event.currentTarget.files?.[0])} className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-semibold file:text-white" />
          <span className="text-xs text-slate-500">PDF, JPG, PNG, or WebP. Maximum 25 MB.</span>
        </label>

        {fileError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">
            <p>{fileError}</p>
            <button type="button" onClick={removeAttachment} className="mt-2 min-h-9 rounded-md border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800">Remove file</button>
          </div>
        ) : null}
        {uploading ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900" role="status">Uploading your plan securely...</p> : null}
        {state.status === "error" ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">{state.message}</p> : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">By sending this request, you agree that Avantia Build may contact you about this project.</p>
          <SubmitButton pending={pending || uploadPending || uploading} />
        </div>
      </fieldset>
    </form>
  )
}

"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"

import type { ProjectRecord } from "@/lib/projects"

type EitanWhatsAppUploadFormProps = {
  projects: ProjectRecord[]
  selectedProjectId?: string
  isSignedIn: boolean
  errorCode?: string | null
}

const eitanUploadStatusMessages: Record<string, string> = {
  "file-required": "Choose a plan, window schedule, PDF, image, CSV, or Excel file.",
  "file-too-large": "File is too large. Keep it at 25 MB or below.",
  "file-type-not-allowed": "Allowed files: PDF, PNG, JPG, WEBP, CSV, XLS, or XLSX.",
  "project-not-found": "We could not confirm that project for your account.",
  "storage-upload-failed": "Upload failed before the file could be saved. Please try again.",
  "metadata-insert-failed": "Upload reached storage, but metadata could not be saved.",
  "window-schedule-not-found": "Window schedule table was not found. Please upload the plan page or file that includes the window schedule table.",
  "relay-not-configured": "WhatsApp sender is not configured on the server.",
  "relay-timeout": "WhatsApp sender timed out. Please try again.",
  "relay-request-failed": "WhatsApp sender could not be reached.",
  "send-failed": "WhatsApp sender failed. Please try again.",
  "server-error": "Server error while extracting or sending. Please try again.",
  "pdf-text-required": "Could not read text from that PDF. Please upload the page that contains the window schedule table, or export that page as an image.",
  "pdf-text-not-readable": "Could not read text from that PDF. Please upload the page that contains the window schedule table, or export that page as an image.",
}

function errorText(errorCode?: string) {
  return eitanUploadStatusMessages[errorCode || ""] || "Upload failed. Please try again."
}

function BlueprintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3h12l4 4v14H4z" />
      <path d="M16 3v5h5" />
      <path d="M8 12h8" />
      <path d="M8 16h3" />
      <path d="M13 16h3" />
      <path d="M8 19h8" />
    </svg>
  )
}

async function extractPdfTextInBrowser(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ")
    pages.push(`Page ${pageNumber}\n${pageText}`)
  }

  return pages.join("\n\n").trim()
}

export function EitanWhatsAppUploadForm({ projects, selectedProjectId, isSignedIn, errorCode }: EitanWhatsAppUploadFormProps) {
  const [statusText, setStatusText] = useState<string | null>(errorCode ? eitanUploadStatusMessages[errorCode] || "Upload failed. Please try again." : null)
  const [statusTone, setStatusTone] = useState<"error" | "info">("error")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const selectedFile = formData.get("file")

    setIsSubmitting(true)
    setStatusTone("info")
    setStatusText("Extracting the window schedule and sending WhatsApp.")

    try {
      let requestBody: BodyInit = formData
      let requestHeaders: HeadersInit | undefined

      if (selectedFile instanceof File && selectedFile.type === "application/pdf") {
        setStatusText("Reading the PDF in your browser so the large file does not need to upload.")
        let extractedText = ""

        try {
          extractedText = await extractPdfTextInBrowser(selectedFile)
        } catch (error) {
          console.error("PDF text extraction failed", error)
          setStatusTone("error")
          setStatusText(errorText("pdf-text-not-readable"))
          return
        }

        if (!extractedText || extractedText.length < 25) {
          setStatusTone("error")
          setStatusText(errorText("pdf-text-not-readable"))
          return
        }

        requestBody = JSON.stringify({
          recipientMode: formData.get("recipientMode"),
          copyToPhone: formData.get("copyToPhone"),
          projectId: formData.get("projectId"),
          fileName: selectedFile.name,
          extractedText: extractedText.slice(0, 180_000),
        })
        requestHeaders = { "Content-Type": "application/json" }
        setStatusText("Searching the PDF text for the window schedule table.")
      }

      const response = await fetch("/api/shop/eitan/window-schedule", {
        method: "POST",
        headers: requestHeaders,
        body: requestBody,
      })
      const bodyText = await response.text()
      let payload: {
        ok?: boolean
        error?: string
        detail?: string
        whatsappUrl?: string
        sent?: boolean
        itemCount?: number
        delivery?: Array<{ ok?: boolean; phone?: string; error?: string }>
      } = {}

      if (bodyText.trim()) {
        try {
          payload = JSON.parse(bodyText)
        } catch {
          setStatusTone("error")
          setStatusText(response.ok ? "Server returned an unreadable response. Please try again." : `Server returned an error (${response.status}). Please try again.`)
          return
        }
      }

      const recipientMode = String(formData.get("recipientMode") || "david")

      if (!response.ok || !payload.ok || !payload.whatsappUrl) {
        setStatusTone("error")
        setStatusText(errorText(payload.error))
        return
      }

      if (payload.sent) {
        setStatusTone("info")
        if (recipientMode === "supplier") {
          setStatusText(
            payload.itemCount && payload.itemCount > 0
              ? "Plan was successfully extracted, and plan was sent to Supplier. A copy was also sent to you."
              : "Plan was sent to Supplier and copied to you, but no window schedule rows were found automatically.",
          )
        } else {
          setStatusText(
            payload.itemCount && payload.itemCount > 0
              ? "Plan was successfully extracted, and plan was sent to you."
              : "Plan was sent to you, but no window schedule rows were found automatically.",
          )
        }
        form.reset()
        return
      }

      const failed = payload.delivery?.filter((item) => !item.ok).map((item) => item.error).filter(Boolean).join(", ")
      setStatusTone("error")
      setStatusText(failed ? `Automatic WhatsApp send failed: ${failed}.` : "Automatic WhatsApp send failed.")
    } catch {
      setStatusTone("error")
      setStatusText("Could not reach the server. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid gap-3 sm:max-w-2xl sm:gap-4">
      {statusText ? (
        <div className={`rounded-[18px] border px-4 py-3 text-sm ${statusTone === "info" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          {statusText}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <BlueprintIcon />
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            WhatsApp quote
          </span>
        </div>

        <div>
          <h2 className="text-base font-bold leading-5 text-slate-950">Upload Eitan plan</h2>
          <p className="mt-1 text-xs font-medium leading-4 text-slate-500">
            Extracts the window schedule and sends the quote message in the background.
          </p>
        </div>

        <fieldset className="grid gap-2 text-sm font-semibold text-slate-900">
          <legend>Send to</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-3 text-center text-xs font-bold text-slate-900 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800">
              <input type="radio" name="recipientMode" value="david" defaultChecked className="sr-only" />
              Test to me
            </label>
            <label className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-3 text-center text-xs font-bold text-slate-900 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-800">
              <input type="radio" name="recipientMode" value="supplier" className="sr-only" />
              Supplier
            </label>
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-semibold text-slate-900">
          <span>Your WhatsApp number for copy/reply</span>
          <input name="copyToPhone" type="tel" inputMode="tel" placeholder="+1 ..." className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
        </label>

        {isSignedIn ? (
          projects.length > 0 ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>Project</span>
              <select name="projectId" defaultValue={selectedProjectId || projects[0]?.id || ""} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
              Upload without a project, or create a project later to save files.
            </p>
          )
        ) : (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            No login needed. Upload a plan and the WhatsApp message will send in the background.
          </p>
        )}

        <input name="file" type="file" accept=".csv,.xls,.xlsx,.pdf,image/png,image/jpeg,image/webp" required className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />

        <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">
          {isSubmitting ? "Extracting and sending..." : "Extract and send WhatsApp"}
        </button>

        <Link href="https://wa.me/13475675077" className="text-center text-xs font-semibold text-sky-700">
          Open WhatsApp without upload
        </Link>
      </form>
    </section>
  )
}

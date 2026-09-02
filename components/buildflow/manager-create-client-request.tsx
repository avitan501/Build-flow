"use client"

import { Paperclip, Plus, Trash2, UserPlus, X } from "lucide-react"
import { useState, useTransition } from "react"
import { createPortal } from "react-dom"

import type { CreateClientRequestResult, ManagerNewClientInput, ManagerRequestLineInput, ManagerRequestUploadInput } from "@/app/admin/users/actions"
import { createClient } from "@/lib/supabase/client"
import { getSupabasePublicEnv } from "@/lib/supabase/env"

type CustomerOption = { id: string; name: string; email: string | null }
type RequestLine = ManagerRequestLineInput & { key: string }

const UNITS = ["each", "pieces", "sheets", "boxes", "bags", "bundles", "rolls", "linear ft.", "sq. ft.", "gallons", "yards"]
const MAX_ATTACHMENT_COUNT = 10
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])

function emptyLine(): RequestLine {
  return { key: crypto.randomUUID(), name: "", quantity: 1, unit: "each" }
}

export function ManagerCreateClientRequest({
  customers,
  departments,
  initialCustomerId = "",
  compact = false,
  iconOnly = false,
}: {
  customers: CustomerOption[]
  departments: string[]
  initialCustomerId?: string
  compact?: boolean
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [clientSelection, setClientSelection] = useState(initialCustomerId || (customers.length ? "" : "new"))
  const [newClient, setNewClient] = useState<ManagerNewClientInput>({ fullName: "", email: "", phone: "", companyName: "" })
  const [department, setDepartment] = useState("")
  const [title, setTitle] = useState("")
  const [entryMode, setEntryMode] = useState<"paste" | "items">("paste")
  const [freeText, setFreeText] = useState("")
  const [lines, setLines] = useState<RequestLine[]>([{ key: "initial", name: "", quantity: 1, unit: "each" }])
  const [notes, setNotes] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState("")
  const addingClient = clientSelection === "new"
  const hasMaterialInput = attachments.length > 0 || (entryMode === "paste" ? freeText.trim().length >= 3 : lines.some((line) => line.name.trim()))

  function updateLine(key: string, patch: Partial<RequestLine>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))
  }

  function close() {
    if (isPending) return
    setOpen(false)
    setError(null)
  }

  function chooseAttachments(files: File[]) {
    const next = [...attachments, ...files].slice(0, MAX_ATTACHMENT_COUNT)
    const unsupported = next.find((file) => !ALLOWED_ATTACHMENT_TYPES.has(file.type))
    const oversized = next.find((file) => file.size > MAX_ATTACHMENT_SIZE)
    if (attachments.length + files.length > MAX_ATTACHMENT_COUNT) return setError(`Add up to ${MAX_ATTACHMENT_COUNT} photos or files.`)
    if (unsupported) return setError(`${unsupported.name} is not supported. Add a PDF, JPG, PNG, or WebP file.`)
    if (oversized) return setError(`${oversized.name} is too large. Keep each file under 25 MB.`)
    setAttachments(next)
    setError(null)
  }

  async function uploadAttachment(file: File): Promise<ManagerRequestUploadInput> {
    const { url, anonKey } = getSupabasePublicEnv()
    const response = await fetch(`${url}/functions/v1/public-quote-intake`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
      body: JSON.stringify({ action: "prepare_upload", filename: file.name, type: file.type, size: file.size }),
    })
    const prepared = await response.json().catch(() => null) as { path?: string; token?: string; error?: string } | null
    if (!response.ok || !prepared?.path || !prepared.token) throw new Error(prepared?.error || `Could not prepare ${file.name}.`)
    const { error: uploadError } = await createClient().storage.from("project-uploads").uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false })
    if (uploadError) throw new Error(`Could not upload ${file.name}. Please try again.`)
    return { storagePath: prepared.path, filename: file.name, type: file.type, size: file.size }
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      let result: CreateClientRequestResult
      try {
        const uploadedAttachments = await Promise.all(attachments.map(uploadAttachment))
        const response = await fetch("/api/admin/client-requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: idempotencyKey || crypto.randomUUID(),
            customerId: addingClient ? undefined : clientSelection,
            newClient: addingClient ? newClient : undefined,
            department,
            title,
            notes,
            freeText: entryMode === "paste" ? freeText : "",
            lines: entryMode === "items" ? lines : [],
            attachments: uploadedAttachments,
          }),
        })
        result = await response.json() as CreateClientRequestResult
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The request could not reach the server. Please try again.")
        return
      }
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      window.location.assign(`/owner/materials/requests/${encodeURIComponent(result.requestId)}`)
    })
  }

  return (
    <>
      <button type="button" onClick={() => { setIdempotencyKey(crypto.randomUUID()); setOpen(true) }} aria-label="Add new request" title="Add new request" className={iconOnly ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0071e3] text-white hover:bg-[#0066cc]" : compact ? "inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[#0071e3] px-3 text-xs font-semibold text-white" : "inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-sm"}>
        <Plus className="h-4 w-4" />{iconOnly ? null : compact ? "Add New" : "Create request for client"}
      </button>

      {open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[140] grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manager-client-request-title" onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
        <section className="flex max-h-[min(92dvh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.35)]">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Manager request</p><h2 id="manager-client-request-title" className="mt-1 text-xl font-bold text-slate-950">Create request for a client</h2><p className="mt-1 text-sm text-slate-500">Enter the order exactly as the client gave it to you.</p></div>
            <button type="button" onClick={close} disabled={isPending} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500" aria-label="Close"><X className="h-5 w-5" /></button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">Choose client<select value={clientSelection} onChange={(event) => { setClientSelection(event.target.value); setError(null) }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose a client</option><option value="new">+ Add new client</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.email ? ` - ${customer.email}` : ""}</option>)}</select></label>
              {addingClient ? (
                <div className="grid gap-4 rounded-lg border border-sky-100 bg-sky-50/60 p-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-950 sm:col-span-2"><UserPlus className="h-4 w-4 text-[#0066cc]" />Add new client</div>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Full name<input value={newClient.fullName} onChange={(event) => setNewClient((current) => ({ ...current, fullName: event.target.value }))} autoComplete="name" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
                  <p className="text-xs font-medium text-slate-500 sm:col-span-2">Email or phone — enter at least one.</p>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Email<input type="email" value={newClient.email} onChange={(event) => setNewClient((current) => ({ ...current, email: event.target.value }))} autoComplete="email" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Phone<input type="tel" value={newClient.phone} onChange={(event) => setNewClient((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Company <span className="font-normal text-slate-400">(optional)</span><input value={newClient.companyName} onChange={(event) => setNewClient((current) => ({ ...current, companyName: event.target.value }))} autoComplete="organization" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
                </div>
              ) : null}
              <label className="grid gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">Department <span className="font-normal text-slate-400">(optional)</span><select value={department} onChange={(event) => setDepartment(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">No department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-800 sm:col-span-2">Request name <span className="font-normal text-slate-400">(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={department ? `${department} request` : "Material request"} maxLength={180} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" /></label>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-950">Material list</h3><p className="text-xs text-slate-500">Paste the request, enter items, or attach the client&apos;s photo/PDF below.</p></div><div className="inline-flex rounded-lg bg-slate-100 p-1" aria-label="Material entry method"><button type="button" onClick={() => setEntryMode("paste")} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${entryMode === "paste" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Paste list</button><button type="button" onClick={() => setEntryMode("items")} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${entryMode === "items" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Enter items</button></div></div>
              {entryMode === "paste" ? <label className="mt-3 grid gap-1.5 text-sm font-semibold text-slate-800">Client&apos;s list<textarea rows={8} maxLength={4000} value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder="Paste a text message, email, or unorganized material list. AI will separate item, quantity, size, and details." className="min-h-44 resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /><span className="text-xs font-normal text-slate-500">The original text stays saved. AI creates a separate list for review.</span></label> : <><div className="mt-3 flex justify-end"><button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700"><Plus className="h-4 w-4" />Add item</button></div><div className="mt-3 grid gap-3">{lines.map((line, index) => <div key={line.key} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_2.75rem] sm:items-end"><label className="grid gap-1 text-xs font-semibold text-slate-600">Item {index + 1}<input value={line.name} onChange={(event) => updateLine(line.key, { name: event.target.value })} placeholder="Example: 5/8 in. Type X drywall" className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Quantity<input type="number" min="0.01" step="any" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Unit<select value={line.unit} onChange={(event) => updateLine(line.key, { unit: event.target.value })} className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm">{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 disabled:opacity-30" aria-label={`Remove item ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div></>}
            </div>

            <div className="mt-4">{showNotes ? <label className="grid gap-1.5 text-sm font-semibold text-slate-800">Request notes <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery, brand, timing, or other instructions" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label> : <button type="button" onClick={() => setShowNotes(true)} className="text-sm font-semibold text-[#0066cc]">+ Add optional notes</button>}</div>
            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-sky-300 bg-white px-3 text-sm font-bold text-[#0066cc]"><Paperclip className="h-4 w-4" /><span>Add photos or files</span><input type="file" accept="image/jpeg,image/png,image/webp,.pdf" multiple className="sr-only" onChange={(event) => { chooseAttachments(Array.from(event.target.files ?? [])); event.currentTarget.value = "" }} /></label>
              <p className="mt-1.5 text-xs text-slate-500">Photos, PDF, or plans · up to 10 files</p>
              {attachments.length ? <div className="mt-2 grid gap-1.5">{attachments.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{file.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>)}</div> : null}
            </div>
            {error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={close} disabled={isPending} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={submit} disabled={isPending || !clientSelection || !hasMaterialInput || (addingClient && (!newClient.fullName.trim() || (!newClient.email.trim() && !newClient.phone?.trim())))} className="min-h-11 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40">{isPending ? "Creating..." : entryMode === "paste" || attachments.length ? "Create and organize" : "Create client request"}</button></footer>
        </section>
      </div>, document.body) : null}
    </>
  )
}

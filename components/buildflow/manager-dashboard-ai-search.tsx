"use client"

import { Camera, Clock3, History, LoaderCircle, Plus, Search, Sparkles, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState, useTransition } from "react"

import { searchManagerDashboardAction } from "@/app/admin/build-map/actions"
import type { DashboardAiHistoryItem } from "@/lib/manager-command-center"

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

const AI_MODELS = [
  { value: "luna", label: "Luna · Fast" },
  { value: "terra", label: "Terra · Recommended" },
  { value: "sol", label: "Sol · Deep analysis" },
] as const

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG, or WebP photo.")
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84))
  if (!blob) throw new Error("This photo could not be prepared.")
  if (blob.size > 4 * 1024 * 1024) throw new Error("Choose a smaller photo.")
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
}

export function ManagerDashboardAiSearch({ initialHistory, enabled, compact = false }: { initialHistory: DashboardAiHistoryItem[]; enabled: boolean; compact?: boolean }) {
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState("")
  const [history, setHistory] = useState(initialHistory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [model, setModel] = useState("terra")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  async function selectPhoto(file: File | undefined) {
    if (!file) return
    setError("")
    try {
      const prepared = await preparePhoto(file)
      if (photoUrl) URL.revokeObjectURL(photoUrl)
      setPhoto(prepared)
      setPhotoUrl(URL.createObjectURL(prepared))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This photo could not be added.")
      if (photoInput.current) photoInput.current.value = ""
    }
  }

  function removePhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhoto(null)
    setPhotoUrl("")
    if (photoInput.current) photoInput.current.value = ""
  }

  function runSearch() {
    setError("")
    startTransition(async () => {
      const formData = new FormData()
      formData.set("query", query)
      formData.set("model", model)
      if (photo) formData.set("image", photo)
      const result = await searchManagerDashboardAction(formData)
      if (!result.ok) { setError(result.error); return }
      setAnswer(result.answer)
      setHistory(result.history)
    })
  }

  return <details className={`group min-w-0 ${compact ? "[&[open]]:col-span-3" : "[&[open]]:col-span-2 sm:[&[open]]:col-span-4"}`}>
    <summary className={`flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-sm hover:border-slate-400 ${compact ? "h-10 w-10 px-0" : "min-h-12 w-full px-3"}`} title="Orders & Requests AI">
      <Plus className={`h-4 w-4 text-[#0071e3] group-open:hidden ${compact ? "hidden" : ""}`} />
      <X className="hidden h-4 w-4 text-slate-500 group-open:block" />
      <Sparkles className="h-3.5 w-3.5" />
      <span id="dashboard-ai-title" className={compact ? "sr-only" : ""}>Orders &amp; Requests AI</span>
    </summary>
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">Ask about construction, clients, requests, quotes, suppliers, goals, or an attached photo.</p><button type="button" onClick={() => setHistoryOpen((open) => !open)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-[11px] font-semibold"><History className="h-3.5 w-3.5" />History</button></div>
      <form onSubmit={(event) => { event.preventDefault(); runSearch() }} className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2"><label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"><Camera className="h-4 w-4 text-[#0071e3]" />Add photo<input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectPhoto(event.target.files?.[0])} className="sr-only" /></label><label className="flex h-9 items-center gap-2 text-xs font-semibold text-slate-600"><span>Model</span><select aria-label="AI model" value={model} onChange={(event) => setModel(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900">{AI_MODELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        {photoUrl ? <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"><Image src={photoUrl} alt="Attached question" width={48} height={48} unoptimized className="h-12 w-12 rounded object-cover" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{photo?.name}</span><button type="button" onClick={removePhoto} aria-label="Remove photo" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500"><X className="h-4 w-4" /></button></div> : null}
        <div className="flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Ask Avantia AI</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={2000} placeholder={photo ? "What should AI check in this photo?" : "Ask about a job, client, material, or team task"} className="min-h-12 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-sky-100" /></label>
        <button type="submit" disabled={pending || (!photo && query.trim().length < 2) || !enabled} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:bg-slate-300">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Ask"}</button></div>
      </form>
      {!enabled ? <p className="mt-2 text-xs font-semibold text-amber-700">Waiting for the OpenAI key to be added to Vercel and redeployed.</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {answer ? <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{answer}</p></div> : null}
      {historyOpen ? <div className="mt-3 border-t border-slate-200 bg-slate-50 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Recent searches</h3><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close history" className="inline-flex h-8 w-8 items-center justify-center"><X className="h-4 w-4" /></button></div>{history.length ? <div className="grid gap-2">{history.map((item) => <button key={item.id} type="button" onClick={() => { setQuery(item.query); setAnswer(item.answer); setHistoryOpen(false) }} className="rounded-md border border-slate-200 bg-white p-3 text-left"><span className="block truncate text-sm font-semibold">{item.query}</span><span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3 w-3" />{formatTime(item.createdAt)}</span></button>)}</div> : <p className="text-sm text-slate-500">No searches yet.</p>}</div> : null}
    </div>
  </details>
}

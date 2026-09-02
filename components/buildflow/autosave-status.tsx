"use client"

import { Check, LoaderCircle, RotateCcw } from "lucide-react"

import type { AutosaveState } from "@/lib/use-sequenced-autosave"

export function AutosaveStatus({ status, error, retry }: AutosaveState & { retry: () => void }) {
  if (status === "idle") return <span className="text-[10px] font-semibold text-slate-400">Autosaves</span>
  if (status === "saving") return <span role="status" className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700"><LoaderCircle className="h-3 w-3 animate-spin" />Saving…</span>
  if (status === "saved") return <span role="status" className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><Check className="h-3 w-3" />Saved</span>
  return <span role="alert" className="inline-flex min-w-0 items-center gap-1 text-[10px] font-bold text-rose-700"><span className="truncate" title={error}>{error || "Not saved"}</span><button type="button" onClick={retry} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded border border-rose-200 bg-white px-2"><RotateCcw className="h-3 w-3" />Retry</button></span>
}

"use client"

import { Check, Copy, ExternalLink, Phone, X } from "lucide-react"
import { useState } from "react"

import { recordCommunicationActivityAction } from "@/app/admin/activity-actions"
import {
  communicationQuoCallHref,
  normalizeCommunicationCallPhone,
} from "@/lib/aura/phone-links"

export function CommunicationCallLauncher({ open, phone, name, onClose }: { open: boolean; phone: string; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const normalizedPhone = normalizeCommunicationCallPhone(phone)
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent
  const mobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  const callHref = normalizedPhone
    ? communicationQuoCallHref(normalizedPhone, userAgent)
    : null

  if (!open) return null

  function close() {
    setCopied(false)
    onClose()
  }

  async function copyNumber() {
    if (!normalizedPhone) return
    try {
      await navigator.clipboard.writeText(normalizedPhone)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function recordLaunch() {
    if (!normalizedPhone) return
    void recordCommunicationActivityAction({
      channel: "call",
      recipient: normalizedPhone,
      label: name,
      outcome: "opened_on_device",
      durationSeconds: 0,
    }).catch(() => undefined)
  }

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="communication-call-title">
    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0071e3]">Call with Q U O</p><h2 id="communication-call-title" className="mt-1 text-xl font-bold">{name}</h2><p className="mt-1 text-sm text-slate-500">{normalizedPhone || phone}</p></div><button type="button" onClick={close} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200" aria-label="Close call options"><X className="h-4 w-4" /></button></div>
      {normalizedPhone ? <>
        <p className="mt-5 rounded-md bg-sky-50 px-3 py-2 text-sm leading-6 text-sky-900">{mobile ? "Q U O will open with the verified number and Avantia caller ID." : "Q U O must be installed and set as the default app for TEL links on this computer."}</p>
        <div className="mt-4 grid gap-2">
          <a href={callHref || undefined} aria-disabled={!callHref} onClick={recordLaunch} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold ${callHref ? "bg-emerald-600 text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}><Phone className="h-5 w-5" />{mobile ? "Open Q U O and call" : "Open calling app"}<ExternalLink className="h-4 w-4" /></a>
          <button type="button" onClick={copyNumber} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? "Number copied" : "Copy number"}</button>
        </div>
        <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">Opening the options above does not place a call. The call starts only after you confirm it in Q U O or your configured calling app.</p>
      </> : <p className="mt-5 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">This contact does not have a valid phone number.</p>}
    </div>
  </div>
}

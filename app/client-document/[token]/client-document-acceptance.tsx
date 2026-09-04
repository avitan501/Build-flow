"use client"

import { useActionState } from "react"

import { formatSiteDateTime } from "@/lib/site-date-time"

import { acceptClientDocumentAction, type ClientDocumentAcceptanceState } from "./actions"

export type ClientDocumentAcceptanceReceipt = {
  documentVersion: number
  termsVersion: string
  termsHash: string
  signerName: string
  signerEmail: string | null
  acceptedAt: string
  timezone: "America/New_York"
}

function newYorkTime(value: string) {
  return formatSiteDateTime(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

function AcceptanceReceipt({ receipt, message = "Acknowledgement recorded." }: { receipt: ClientDocumentAcceptanceReceipt; message?: string }) {
  return <section className="border-t border-emerald-200 bg-emerald-50/70 px-5 py-5 sm:px-8" aria-live="polite">
    <p className="text-[10px] font-black uppercase tracking-[.12em] text-emerald-800">Accepted version</p>
    <h2 className="mt-1 text-lg font-black text-emerald-950">{message}</h2>
    <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
      <div><dt className="text-slate-500">Signer</dt><dd className="font-bold text-slate-900">{receipt.signerName}</dd></div>
      <div><dt className="text-slate-500">Recorded</dt><dd className="font-semibold text-slate-900">{newYorkTime(receipt.acceptedAt)}</dd></div>
      <div><dt className="text-slate-500">Receipt</dt><dd className="font-mono text-xs text-slate-700">Document v{receipt.documentVersion} · {receipt.termsVersion} · {receipt.termsHash.slice(0, 12)}</dd></div>
    </dl>
  </section>
}

export function ClientDocumentAcceptance({
  token,
  documentVersion,
  documentLabel,
  initialReceipt,
}: {
  token: string
  documentVersion: number
  documentLabel: string
  initialReceipt?: ClientDocumentAcceptanceReceipt
}) {
  const initialState: ClientDocumentAcceptanceState = { status: "idle", message: "" }
  const [state, formAction, pending] = useActionState(acceptClientDocumentAction, initialState)
  const receipt = state.receipt || initialReceipt
  if (receipt) return <AcceptanceReceipt receipt={receipt} message={state.message || "Acknowledgement recorded."} />

  return <section className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
    <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#0066cc]">Document acknowledgement</p>
    <h2 className="mt-1 text-lg font-black">Accept this {documentLabel.toLowerCase()} version</h2>
    <p className="mt-1 text-sm leading-6 text-slate-600">This records your acknowledgement of the exact document and Terms &amp; Conditions version shown above.</p>
    <form action={formAction} className="mt-4 grid gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="documentVersion" value={documentVersion} />
      <label className="grid gap-1.5 text-sm font-bold">Signer name
        <input name="signerName" autoComplete="name" required minLength={2} maxLength={120} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal" />
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6">
        <input name="consent" type="checkbox" value="accepted" required className="mt-1 h-4 w-4 shrink-0" />
        <span>I reviewed this {documentLabel.toLowerCase()}, including the Terms &amp; Conditions shown above, and acknowledge this version.</span>
      </label>
      {state.message ? <p className={`text-sm font-semibold ${state.status === "version-changed" || state.status === "error" ? "text-rose-700" : "text-emerald-700"}`} aria-live="polite">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Recording…" : `Acknowledge ${documentLabel.toLowerCase()} v${documentVersion}`}</button>
    </form>
  </section>
}

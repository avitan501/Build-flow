"use client"

import { History, Send, X } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { sendSupplierQuoteRequestAction } from "@/app/admin/vendors/actions"

const JOB_ADDRESS = "280 Lawrence Ave, Lawrence, NY 11559"

export function SupplierQuoteRequestDialog({
  supplierId,
  supplierName,
  supplierEmail,
}: {
  supplierId: string
  supplierName: string
  supplierEmail: string | null
}) {
  const [open, setOpen] = useState(false)
  const [materialList, setMaterialList] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const canSend = Boolean(supplierEmail?.trim())

  function close() {
    if (isPending) return
    setOpen(false)
    setError("")
    setSent(false)
    setMaterialList("")
  }

  function submit() {
    setError("")
    startTransition(async () => {
      const result = await sendSupplierQuoteRequestAction({ supplierId, materialList })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSent(true)
    })
  }

  return (
    <>
      <button
        type="button"
        disabled={!canSend}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
        title={canSend ? "Create a material quote request" : "Add a supplier email first"}
      >
        <Send className="h-4 w-4" />
        Request material quote
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="supplier-quote-dialog-title" onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[20px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.35)]">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0066cc]">New supplier request</p>
                <h2 id="supplier-quote-dialog-title" className="mt-1 text-xl font-bold text-slate-950">Request a material quote</h2>
              </div>
              <button type="button" onClick={close} disabled={isPending} aria-label="Close" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"><X className="h-5 w-5" /></button>
            </header>

            <div className="p-5 sm:p-6">
              {sent ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                  <h3 className="text-lg font-bold">Quote request sent</h3>
                  <p className="mt-2 text-sm leading-6">The material list was emailed to {supplierName}. It is saved in Sent Requests.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/admin/supplier-requests" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"><History className="h-4 w-4" />View sent requests</Link>
                    <button type="button" onClick={close} className="min-h-11 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold">Done</button>
                  </div>
                </div>
              ) : (
                <>
                  <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</dt><dd className="mt-1 font-semibold text-slate-950">{supplierName}</dd><dd className="break-all text-slate-600">{supplierEmail}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job location</dt><dd className="mt-1 font-semibold text-slate-950">{JOB_ADDRESS}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email subject</dt><dd className="mt-1 text-slate-700">Quote Request - {JOB_ADDRESS}</dd></div>
                  </dl>

                  <label className="mt-5 block text-sm font-bold text-slate-950">
                    Material list
                    <textarea
                      autoFocus
                      value={materialList}
                      onChange={(event) => setMaterialList(event.target.value)}
                      rows={12}
                      maxLength={20_000}
                      placeholder={"Paste the complete material list here.\n\nExample:\n100 - 2x4x8 studs\n25 - 1/2 in. drywall, 4x8\n10 - All-purpose joint compound"}
                      className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-base leading-6 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">The email will ask for pricing, availability, lead time, and delivery charges.</p>
                  {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p> : null}
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={close} disabled={isPending} className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 disabled:opacity-40">Cancel</button>
                    <button type="button" onClick={submit} disabled={isPending || !materialList.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-5 text-sm font-semibold text-white disabled:opacity-40"><Send className="h-4 w-4" />{isPending ? "Sending..." : "Send quote request"}</button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

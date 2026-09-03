import Image from "next/image"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { parseRequestClientDocument, type StoredRequestClientDocument } from "@/lib/request-client-document-data"
import { requestPaymentGuidance, requestPaymentMethodLabel } from "@/lib/request-client-payment"
import { createClient } from "@/lib/supabase/server"

export const metadata = { robots: { index: false, follow: false } }

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export default async function ClientDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  await connection()
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()
  const supabase = await createClient()
  const { data: row } = await supabase.rpc("get_request_client_document", { p_public_token: token }).maybeSingle<StoredRequestClientDocument>()
  if (!row) notFound()
  const document = parseRequestClientDocument(row)
  if (!document) notFound()
  const label = row.document_type === "invoice" ? "Invoice" : row.document_type === "receipt" ? "Receipt" : "Estimate"
  const subtotal = document.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const tax = (subtotal + (document.taxableDelivery ? document.deliveryCharge : 0)) * document.salesTaxRate / 100
  const total = subtotal + document.deliveryCharge + tax

  return <main className="min-h-screen bg-slate-100 px-3 py-6 text-slate-950 sm:px-6">
    <article className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 px-5 py-6 sm:px-8">
        <Image src="/images/avantia/avantia-build-lockup-share.png" alt="Avantia Build" width={210} height={70} className="h-auto w-44" priority />
        <div className="text-right"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0066cc]">{label}</p><h1 className="mt-1 text-xl font-black">{row.document_number}</h1><p className="mt-1 text-xs text-slate-500">Version {row.version} · Updated {new Date(row.updated_at).toLocaleString("en-US")}</p></div>
      </header>
      <section className="grid gap-4 border-b border-slate-200 px-5 py-5 text-sm sm:grid-cols-2 sm:px-8">
        <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Prepared for</p><p className="mt-1 font-bold">{document.clientName}</p><p className="whitespace-pre-wrap text-slate-600">{document.clientAddress}</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Ship to</p><p className="mt-1 whitespace-pre-wrap font-semibold">{document.shipTo || "Not provided"}</p></div>
      </section>
      <section className="overflow-x-auto px-5 py-5 sm:px-8">
        <table className="w-full min-w-[38rem] text-left text-sm"><thead className="bg-[#071426] text-white"><tr><th className="px-3 py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right">Total</th></tr></thead><tbody>{document.lines.map((line, index) => <tr key={`${line.description}-${index}`} className="border-b border-slate-200"><td className="px-3 py-3 font-semibold">{line.description}</td><td className="px-3 py-3">{line.quantity}</td><td className="px-3 py-3">{line.unit}</td><td className="px-3 py-3 text-right tabular-nums">{money.format(line.unitPrice)}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{money.format(line.quantity * line.unitPrice)}</td></tr>)}</tbody></table>
        <div className="ml-auto mt-5 grid max-w-sm gap-2 text-sm"><div className="flex justify-between"><span>Materials</span><strong>{money.format(subtotal)}</strong></div><div className="flex justify-between"><span>Delivery</span><strong>{money.format(document.deliveryCharge)}</strong></div><div className="flex justify-between"><span>Sales tax ({document.salesTaxRate}%)</span><strong>{money.format(tax)}</strong></div><div className="flex justify-between border-t border-slate-300 pt-3 text-lg"><span>{row.document_type === "invoice" ? "Amount due" : row.document_type === "receipt" ? "Amount paid" : "Estimate total"}</span><strong>{money.format(total)}</strong></div></div>
      </section>
      {document.terms ? <section className="border-t border-slate-200 px-5 py-5 sm:px-8"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Terms & conditions</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{document.terms}</p></section> : null}
      {document.paymentRequest ? <section className="border-t border-sky-200 bg-sky-50/70 px-5 py-5 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#0066cc]">Payment request</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Amount due</span><strong className="mt-0.5 block text-lg tabular-nums">{money.format(document.paymentRequest.amountDue)}</strong></p><p><span className="text-slate-500">Payment method</span><strong className="mt-0.5 block">{requestPaymentMethodLabel(document.paymentRequest.method)}</strong></p></div>
        {document.paymentRequest.instructions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{document.paymentRequest.instructions}</p> : null}
        <p className="mt-3 text-sm leading-6 text-slate-700">{requestPaymentGuidance(document.paymentRequest)}</p>
        {document.paymentRequest.securePaymentUrl ? <a href={document.paymentRequest.securePaymentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white">Open secure payment page</a> : <a href="tel:+15169088319" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#0071e3] bg-white px-5 text-sm font-bold text-[#0066cc]">Coordinate payment by phone</a>}
      </section> : document.paymentLink ? <section className="border-t border-sky-200 bg-sky-50/70 px-5 py-5 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#0066cc]">Secure payment</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">Use Avantia Build&apos;s secure hosted payment page. Do not send payment details by email or text.</p>
        <a href={document.paymentLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white">Open secure payment page</a>
      </section> : null}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
        <a href={`/client-document/${token}/download`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold">Download PDF</a>
      </footer>
    </article>
  </main>
}

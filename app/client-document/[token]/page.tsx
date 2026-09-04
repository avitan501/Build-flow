import Image from "next/image"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import {
  CLIENT_DOCUMENT_TERMS_VERSION,
  clientDocumentTerms,
  clientDocumentTermsHash,
} from "@/lib/request-client-document-acceptance"
import { parseRequestClientDocument, type StoredRequestClientDocumentWithAcceptance } from "@/lib/request-client-document-data"
import { requestClientPaymentDocumentCopy } from "@/lib/request-client-payment"
import { formatSiteDateTime } from "@/lib/site-date-time"
import { createClient } from "@/lib/supabase/server"

import { ClientDocumentAcceptance, type ClientDocumentAcceptanceReceipt } from "./client-document-acceptance"

export const metadata = { robots: { index: false, follow: false } }

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export default async function ClientDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  await connection()
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()
  const supabase = await createClient()
  const { data: row } = await supabase.rpc("get_request_client_document", { p_public_token: token }).maybeSingle<StoredRequestClientDocumentWithAcceptance>()
  if (!row) notFound()
  const document = parseRequestClientDocument(row)
  if (!document) notFound()
  const label = row.document_type === "invoice" ? "Invoice" : row.document_type === "receipt" ? "Receipt" : "Estimate"
  const subtotal = document.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const tax = (subtotal + (document.taxableDelivery ? document.deliveryCharge : 0)) * document.salesTaxRate / 100
  const total = subtotal + document.deliveryCharge + tax
  const termsText = clientDocumentTerms(document.terms)
  const termsHash = clientDocumentTermsHash(termsText)
  const paymentCopy = document.paymentRequest ? requestClientPaymentDocumentCopy(document.paymentRequest, row.document_type) : null
  const receipt: ClientDocumentAcceptanceReceipt | undefined = row.acceptance_id
    && row.accepted_document_version === row.version
    && row.accepted_terms_version === CLIENT_DOCUMENT_TERMS_VERSION
    && row.accepted_terms_hash === termsHash
    && row.accepted_signer_name
    && row.accepted_timestamp
    && row.accepted_timezone === "America/New_York"
    ? {
      documentVersion: row.accepted_document_version,
      termsVersion: row.accepted_terms_version,
      termsHash: row.accepted_terms_hash,
      signerName: row.accepted_signer_name,
      signerEmail: row.accepted_signer_email,
      acceptedAt: row.accepted_timestamp,
      timezone: row.accepted_timezone,
    }
    : undefined

  return <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(145deg,#eef5fb_0%,#f8fafc_45%,#f3f4f6_100%)] px-3 py-4 text-slate-950 sm:px-6 sm:py-8">
    <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,.10)]">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Image src="/images/avantia/avantia-build-lockup-share.png" alt="Avantia Build" width={210} height={70} className="h-auto w-36 sm:w-44" priority />
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[#0066cc]">{label}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold text-slate-500">Document</p><h1 className="mt-1 break-all text-xl font-black tracking-tight sm:text-2xl">{row.document_number}</h1></div>
          <p className="text-xs leading-5 text-slate-500">Version {row.version}<br />Updated {formatSiteDateTime(row.updated_at)}</p>
        </div>
      </header>
      <section className="grid gap-4 border-b border-slate-200 px-5 py-5 text-sm sm:grid-cols-2 sm:px-8">
        <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Prepared for</p><p className="mt-1 font-bold">{document.clientName}</p><p className="whitespace-pre-wrap text-slate-600">{document.clientAddress}</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Ship to</p><p className="mt-1 whitespace-pre-wrap font-semibold">{document.shipTo || "Not provided"}</p></div>
      </section>
      <section className="px-5 py-5 sm:px-8 sm:py-7">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-black">Materials</h2><span className="text-xs font-semibold text-slate-500">{document.lines.length} item{document.lines.length === 1 ? "" : "s"}</span></div>
        <div className="grid gap-3 md:hidden">{document.lines.map((line, index) => <article key={`${line.description}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="break-words text-sm font-bold leading-5">{line.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-xs"><span className="text-slate-500">Quantity</span><strong className="text-right">{line.quantity} {line.unit}</strong><span className="text-slate-500">Unit price</span><strong className="text-right tabular-nums">{money.format(line.unitPrice)}</strong><span className="font-semibold text-slate-700">Line total</span><strong className="text-right tabular-nums">{money.format(line.quantity * line.unitPrice)}</strong></div>
        </article>)}</div>
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block"><table className="w-full table-fixed text-left text-sm"><thead className="bg-[#071426] text-white"><tr><th className="w-[46%] px-4 py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody>{document.lines.map((line, index) => <tr key={`${line.description}-${index}`} className="border-b border-slate-200 last:border-0"><td className="break-words px-4 py-3 font-semibold">{line.description}</td><td className="px-3 py-3">{line.quantity}</td><td className="px-3 py-3">{line.unit}</td><td className="px-3 py-3 text-right tabular-nums">{money.format(line.unitPrice)}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{money.format(line.quantity * line.unitPrice)}</td></tr>)}</tbody></table></div>
        <div className="ml-auto mt-5 grid max-w-sm gap-2 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-600">Materials</span><strong className="tabular-nums">{money.format(subtotal)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-600">Delivery</span><strong className="tabular-nums">{money.format(document.deliveryCharge)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-600">Sales tax ({document.salesTaxRate}%)</span><strong className="tabular-nums">{money.format(tax)}</strong></div><div className="mt-1 flex justify-between gap-4 border-t border-slate-300 pt-3 text-lg"><span className="font-black">{row.document_type === "invoice" ? "Amount due" : row.document_type === "receipt" ? "Amount paid" : "Estimate total"}</span><strong className="tabular-nums text-[#0066cc]">{money.format(total)}</strong></div></div>
      </section>
      {document.attachments?.length ? <section className="border-t border-slate-200 px-5 py-5 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Attached photos &amp; documents</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{document.attachments.map((attachment) => <a key={attachment.id} href={`/client-document/${token}/attachments/${attachment.id}?v=${row.version}`} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-[#0066cc]"><span aria-hidden="true">↧</span><span className="min-w-0 flex-1 truncate">{attachment.fileName}</span><span className="shrink-0 text-xs font-medium text-slate-500">{Math.max(1, Math.round(attachment.fileSize / 1024))} KB</span></a>)}</div>
      </section> : null}
      <section className="border-t border-slate-200 px-5 py-3 sm:px-8"><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Terms &amp; conditions</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-4 text-slate-600">{termsText}</p></section>
      {document.paymentRequest && paymentCopy ? <section className="border-t border-sky-200 bg-sky-50/70 px-5 py-5 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#0066cc]">{paymentCopy.heading}</p>
        <p className="mt-3 text-sm"><span className="text-slate-500">{paymentCopy.amountLabel}</span><strong className="mt-0.5 block text-lg tabular-nums">{money.format(document.paymentRequest.amountDue)}</strong></p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{paymentCopy.sections.map((section) => <article key={section.method} className="rounded-lg border border-sky-200 bg-white p-4">
          <h2 className="text-sm font-black">{section.label}</h2>
          {section.instructions ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{section.instructions}</p> : null}
          {section.guidance ? <p className="mt-2 text-sm leading-6 text-slate-700">{section.guidance}</p> : null}
        </article>)}</div>
        {row.document_type !== "receipt" ? paymentCopy.securePaymentUrl ? <a href={paymentCopy.securePaymentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white">Pay Avantia Build securely</a> : <a href="tel:+15169088319" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#0071e3] bg-white px-5 text-sm font-bold text-[#0066cc]">Call Avantia Build to coordinate payment</a> : null}
      </section> : document.paymentLink ? <section className="border-t border-sky-200 bg-sky-50/70 px-5 py-5 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#0066cc]">Secure payment</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">Use Avantia Build&apos;s secure hosted payment page. Do not send payment details by email or text.</p>
        <a href={document.paymentLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0071e3] px-5 text-sm font-bold text-white">Open secure payment page</a>
      </section> : null}
      {row.document_type !== "receipt" ? <ClientDocumentAcceptance token={token} documentVersion={row.version} documentLabel={label} initialReceipt={receipt} /> : null}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
        <a href={`/client-document/${token}/download`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold">Download PDF</a>
      </footer>
    </article>
  </main>
}

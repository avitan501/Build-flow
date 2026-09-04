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

  return <main className="min-h-screen bg-slate-100 px-3 py-6 text-slate-950 sm:px-6">
    <article className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 px-5 py-6 sm:px-8">
        <Image src="/images/avantia/avantia-build-lockup-share.png" alt="Avantia Build" width={210} height={70} className="h-auto w-44" priority />
        <div className="text-right"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0066cc]">{label}</p><h1 className="mt-1 text-xl font-black">{row.document_number}</h1><p className="mt-1 text-xs text-slate-500">Version {row.version} · Updated {formatSiteDateTime(row.updated_at)}</p></div>
      </header>
      <section className="grid gap-4 border-b border-slate-200 px-5 py-5 text-sm sm:grid-cols-2 sm:px-8">
        <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Prepared for</p><p className="mt-1 font-bold">{document.clientName}</p><p className="whitespace-pre-wrap text-slate-600">{document.clientAddress}</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Ship to</p><p className="mt-1 whitespace-pre-wrap font-semibold">{document.shipTo || "Not provided"}</p></div>
      </section>
      <section className="overflow-x-auto px-5 py-5 sm:px-8">
        <table className="w-full min-w-[38rem] text-left text-sm"><thead className="bg-[#071426] text-white"><tr><th className="px-3 py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right">Total</th></tr></thead><tbody>{document.lines.map((line, index) => <tr key={`${line.description}-${index}`} className="border-b border-slate-200"><td className="px-3 py-3 font-semibold">{line.description}</td><td className="px-3 py-3">{line.quantity}</td><td className="px-3 py-3">{line.unit}</td><td className="px-3 py-3 text-right tabular-nums">{money.format(line.unitPrice)}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{money.format(line.quantity * line.unitPrice)}</td></tr>)}</tbody></table>
        <div className="ml-auto mt-5 grid max-w-sm gap-2 text-sm"><div className="flex justify-between"><span>Materials</span><strong>{money.format(subtotal)}</strong></div><div className="flex justify-between"><span>Delivery</span><strong>{money.format(document.deliveryCharge)}</strong></div><div className="flex justify-between"><span>Sales tax ({document.salesTaxRate}%)</span><strong>{money.format(tax)}</strong></div><div className="flex justify-between border-t border-slate-300 pt-3 text-lg"><span>{row.document_type === "invoice" ? "Amount due" : row.document_type === "receipt" ? "Amount paid" : "Estimate total"}</span><strong>{money.format(total)}</strong></div></div>
      </section>
      <section className="border-t border-slate-200 px-5 py-5 sm:px-8"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Terms &amp; conditions</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{termsText}</p></section>
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
      {row.document_type !== "receipt" ? <ClientDocumentAcceptance token={token} documentVersion={row.version} documentLabel={label} clientEmail={document.clientEmail} initialReceipt={receipt} /> : null}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
        <a href={`/client-document/${token}/download`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold">Download PDF</a>
      </footer>
    </article>
  </main>
}

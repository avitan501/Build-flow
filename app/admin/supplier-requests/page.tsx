import { AlertCircle, CheckCircle2, Clock3, Mail, Send } from "lucide-react"
import Link from "next/link"

import { DeleteSupplierQuoteRequestButton } from "@/components/buildflow/delete-supplier-quote-request-button"
import { requireStaffProfile } from "@/lib/auth"
import { formatSiteDateTime } from "@/lib/site-date-time"

type SupplierQuoteRequestRow = {
  id: string
  supplier_name: string
  supplier_email: string
  job_address: string
  subject: string
  material_list: string
  status: "sending" | "sent" | "failed"
  error_message: string | null
  sent_at: string | null
  created_at: string
}

const statusStyles = {
  sending: "border-amber-200 bg-amber-50 text-amber-800",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
}

function formatDate(value: string) {
  return formatSiteDateTime(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function SupplierRequestsPage() {
  const { supabase } = await requireStaffProfile("suppliers")
  const { data, error } = await supabase
    .from("supplier_quote_requests")
    .select("id,supplier_name,supplier_email,job_address,subject,material_list,status,error_message,sent_at,created_at")
    .order("created_at", { ascending: false })
    .returns<SupplierQuoteRequestRow[]>()

  if (error) throw new Error(`Could not load sent supplier requests: ${error.message}`)
  const requests = data ?? []
  const sentCount = requests.filter((request) => request.status === "sent").length
  const failedCount = requests.filter((request) => request.status === "failed").length

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Suppliers</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review every material quote request emailed from Avantia Build.</p>
        </header>

        <nav className="mt-6 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1" aria-label="Supplier directory and requests views">
          <Link href="/admin/vendors" className="flex min-h-11 items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Directory</Link>
          <Link href="/admin/supplier-approvals" className="flex min-h-11 items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Routed requests</Link>
          <Link href="/admin/supplier-requests" className="flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-2 text-center text-sm font-semibold text-white">Sent requests</Link>
        </nav>

        <section className="mt-6 grid grid-cols-3 gap-3" aria-label="Sent request totals">
          <div className="rounded-lg border border-slate-200 bg-white p-4"><Mail className="h-5 w-5 text-[#0066cc]" /><p className="mt-3 text-3xl font-bold">{requests.length}</p><p className="text-sm font-semibold text-slate-600">Total</p></div>
          <div className="rounded-lg border border-emerald-200 bg-white p-4"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><p className="mt-3 text-3xl font-bold">{sentCount}</p><p className="text-sm font-semibold text-slate-600">Sent</p></div>
          <div className="rounded-lg border border-rose-200 bg-white p-4"><AlertCircle className="h-5 w-5 text-rose-700" /><p className="mt-3 text-3xl font-bold">{failedCount}</p><p className="text-sm font-semibold text-slate-600">Failed</p></div>
        </section>

        <section className="mt-6 grid gap-3">
          {requests.length ? requests.map((request) => (
            <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-950">{request.supplier_name}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${statusStyles[request.status]}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-sm text-slate-600">{request.supplier_email}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{request.subject}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.job_address}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3 text-sm text-slate-500">
                  <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{formatDate(request.sent_at || request.created_at)}</div>
                  <DeleteSupplierQuoteRequestButton requestId={request.id} supplierName={request.supplier_name} />
                </div>
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#0066cc]">View material list</summary>
                <pre className="whitespace-pre-wrap break-words border-t border-slate-200 px-4 py-4 font-sans text-sm leading-6 text-slate-800">{request.material_list}</pre>
              </details>
              {request.error_message ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{request.error_message}</p> : null}
            </article>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
              <Send className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-800">No supplier quote requests have been sent yet.</p>
              <Link href="/admin/vendors" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#0071e3] px-4 text-sm font-semibold text-white">Open supplier directory</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

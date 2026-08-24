import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { DepartmentEssentials } from "@/components/buildflow/department-essentials"
import { QuoteRequestForm } from "@/components/buildflow/quote-request-form"
import { getRequestDepartmentConfig, getRequestItemPrompt } from "@/lib/request-department-essentials"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Send a Material List | Avantia Build",
  description: "Send a material list, photo, or blueprint to Avantia Build.",
  path: "/request-quote",
})

export default async function RequestQuotePage({ searchParams }: { searchParams?: Promise<{ request?: string; item?: string }> }) {
  const resolvedSearchParams = await searchParams
  const request = resolvedSearchParams?.request?.trim().toLowerCase()
  const requestedItem = resolvedSearchParams?.item?.trim()
  const department = getRequestDepartmentConfig(request)
  const requestedItemPrompt = getRequestItemPrompt(request, requestedItem)

  return (
    <main className="bg-[#f5f7fa] pb-6 text-slate-950 sm:pb-8">
      <section className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0066cc] transition hover:text-[#004f9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{department ? `${department.label} request` : "Send your material list"}</h1>
          <p className="mt-1 text-sm text-slate-600">Type what you need or attach a file.</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl py-4 sm:px-6 sm:py-6">
        <QuoteRequestForm key={requestedItem ?? "blank-request"} defaultDepartment={department?.label} defaultMaterialDetails={requestedItemPrompt ?? (requestedItem ? `Please provide pricing and availability for: ${requestedItem}` : undefined)} />
        <p className="px-4 py-4 text-center text-xs"><a href="tel:+15169088319" className="font-semibold text-[#0066cc]">Call (516) 908-8319</a></p>
        {department ? <div className="px-5 sm:px-0"><DepartmentEssentials data={department.essentials} /></div> : null}
      </div>
    </main>
  )
}

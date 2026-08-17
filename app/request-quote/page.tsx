import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { DepartmentEssentials } from "@/components/buildflow/department-essentials"
import { QuoteRequestForm } from "@/components/buildflow/quote-request-form"
import { getRequestDepartmentConfig } from "@/lib/request-department-essentials"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Request Material Pricing | Avantia Build",
  description: "Send a material list or blueprint for organized supplier pricing and jobsite delivery.",
  path: "/request-quote",
})

export default async function RequestQuotePage({ searchParams }: { searchParams?: Promise<{ request?: string }> }) {
  const request = (await searchParams)?.request?.trim().toLowerCase()
  const department = getRequestDepartmentConfig(request)

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16 text-slate-950">
      <section className="border-b border-slate-200 bg-[#071126] px-5 py-8 text-white sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-sky-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Avantia Build</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{department ? `${department.label} Materials` : "Get Pricing for Your Materials"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Send your list, blueprint, or material details. We&apos;ll review it and follow up within one business day.</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl py-6 sm:px-6 sm:py-8">
        <QuoteRequestForm defaultDepartment={department?.label} />
        <p className="px-5 py-5 text-center text-xs text-slate-500">Need help now? Call <a href="tel:+15169088319" className="font-semibold text-[#0066cc]">(516) 908-8319</a>.</p>
        {department ? <div className="px-5 sm:px-0"><DepartmentEssentials data={department.essentials} /></div> : null}
      </div>
    </main>
  )
}

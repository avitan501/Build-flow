import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { QuoteRequestForm } from "@/components/buildflow/quote-request-form"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Beat a Material Quote | Avantia Build",
  description: "Upload an existing material quote for a comparison of products, quantities, pricing, and delivery terms.",
  path: "/beat-a-quote",
})

export default function BeatAQuotePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16 text-slate-950">
      <section className="border-b border-slate-200 bg-[#071126] px-5 py-8 text-white sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-sky-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Avantia Build</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Upload a Quote. We&apos;ll Try to Beat It.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Upload a current supplier quote. We&apos;ll compare the materials, quantities, and delivery terms for a better option.</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl py-6 sm:px-6 sm:py-8">
        <QuoteRequestForm mode="beat" />
        <p className="px-5 py-5 text-center text-xs text-slate-500">Need help now? Call <a href="tel:+15169088319" className="font-semibold text-[#0066cc]">(516) 908-8319</a>.</p>
      </div>
    </main>
  )
}

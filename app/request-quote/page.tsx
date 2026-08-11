import { QuoteRequestForm } from "@/components/buildflow/quote-request-form"

export default function RequestQuotePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-16 text-slate-950">
      <section className="border-b border-slate-200 bg-[#071126] px-5 py-8 text-white sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Avantia Build</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Get Pricing for Your Materials</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Send your list, blueprint, or material details. We&apos;ll review it and follow up within one business day.</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl py-6 sm:px-6 sm:py-8">
        <QuoteRequestForm />
        <p className="px-5 py-5 text-center text-xs text-slate-500">Need help now? Call <a href="tel:+19292077156" className="font-semibold text-[#0066cc]">(929) 207-7156</a>.</p>
      </div>
    </main>
  )
}

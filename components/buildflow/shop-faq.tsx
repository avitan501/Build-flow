"use client"

import { Mail, MessageCircle, Phone } from "lucide-react"

import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider"

const FAQ_ITEMS = [
  { question: "How does pricing work?", answer: "Send the material, size, quantity, and delivery details. Avantia reviews the request and confirms current supplier pricing before an order is approved." },
  { question: "When can materials be delivered?", answer: "Timing depends on stock, supplier cutoff times, and the jobsite address. We confirm the available delivery window before you approve the order." },
  { question: "Can I return materials?", answer: "Return eligibility depends on the supplier and the item. Custom, cut, tinted, opened, and special-order materials may not be returnable. Confirm the written quote before ordering." },
  { question: "What happens if an item is unavailable?", answer: "We contact you before substituting a product. You can approve the alternative, request another option, or remove the item." },
  { question: "What if materials arrive damaged?", answer: "Photograph the material and delivery ticket immediately, keep the packaging, and contact Avantia as soon as possible so we can review the supplier claim." },
]

export function ShopFaq() {
  return (
    <ShopTranslationBoundary>
      <section id="shop-faq" className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="shop-faq-title">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(14rem,.65fr)_minmax(0,1.35fr)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0066cc]">Before you order</p>
            <h2 id="shop-faq-title" className="mt-1 text-2xl font-bold text-slate-950">Material ordering questions</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Get a clear answer before pricing, approval, or delivery.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="tel:+15169088319" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"><Phone className="h-4 w-4" />Call (516) 908-8319</a>
              <a href="https://wa.me/15169088319" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#128c7e] px-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              <a href="mailto:office@build.avantiap.com" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"><Mail className="h-4 w-4" />Email</a>
            </div>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQ_ITEMS.map((item, index) => (
              <details key={item.question} className="group" open={index === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-sm font-bold text-slate-950 marker:content-none">
                  {item.question}<span aria-hidden="true" className="text-xl font-light text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 pr-8 text-sm leading-6 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </ShopTranslationBoundary>
  )
}

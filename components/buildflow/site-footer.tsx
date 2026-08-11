import Link from "next/link"
import { Mail, MessageCircle } from "lucide-react"

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"

const BUSINESS_WHATSAPP_URL = "https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20with%20construction%20materials."

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-7 text-center sm:px-6 sm:pb-9 sm:pt-9">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <Link href="/" aria-label="Avantia home" className="inline-flex">
          <AvantiaBuildLockup />
        </Link>
        <p className="mt-3 text-sm font-semibold text-slate-700">You build. We handle the materials.</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <a href="mailto:office@build.avantiap.com" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-[#0E2A4A] transition hover:border-sky-300 hover:bg-sky-50 hover:text-[#0066cc]">
            <Mail className="h-4 w-4" aria-hidden="true" /> office@build.avantiap.com
          </a>
          <a href="tel:+19292077156" className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-[#0E2A4A] transition hover:border-sky-300 hover:bg-sky-50 hover:text-[#0066cc]">
            (929) 207-7156
          </a>
          <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp us" className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#128c7e] text-white transition hover:bg-[#0f7a6e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              WhatsApp us
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}

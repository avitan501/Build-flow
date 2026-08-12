import Link from "next/link"
import { Mail, MessageCircle, Phone } from "lucide-react"

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"

const BUSINESS_WHATSAPP_URL = "https://wa.me/19292077156?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20with%20construction%20materials."

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#eef3f8] px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6 sm:pt-6">
      <div className="mx-auto grid max-w-[88rem] items-center gap-4 rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(7,17,38,0.05)] sm:grid-cols-[minmax(15rem,1fr)_auto] sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" aria-label="Avantia home" className="inline-flex shrink-0">
            <AvantiaBuildLockup header />
          </Link>
          <div className="min-w-0 border-l border-slate-200 pl-3 sm:pl-4">
            <p className="text-[11px] font-bold leading-4 text-[#071126] sm:text-sm">You build. We handle the materials.</p>
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">Plans, pricing, ordering, and jobsite delivery.</p>
          </div>
        </div>
        <nav aria-label="Avantia contact" className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 border-t border-slate-200 pt-3 sm:flex sm:border-t-0 sm:pt-0">
          <a href="mailto:office@build.avantiap.com" className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-[#0E2A4A] transition hover:bg-sky-50 hover:text-[#0066cc] sm:px-3 sm:text-sm">
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /> <span className="truncate">office@build.avantiap.com</span>
          </a>
          <a href="tel:+19292077156" aria-label="(929) 207-7156" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#0E2A4A] transition hover:bg-sky-50 hover:text-[#0066cc] sm:w-auto sm:gap-2 sm:px-3">
            <Phone className="h-4 w-4" aria-hidden="true" /><span className="hidden text-sm font-semibold sm:inline">(929) 207-7156</span>
          </a>
          <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp us" className="group relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#128c7e] text-white transition hover:bg-[#0f7a6e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              WhatsApp us
            </span>
          </a>
        </nav>
      </div>
    </footer>
  )
}

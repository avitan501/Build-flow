"use client"

import Link from "next/link"
import { Mail, Phone } from "lucide-react"
import { usePathname } from "next/navigation"

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"
import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider"
import { WhatsAppIcon } from "@/components/buildflow/whatsapp-icon"

const BUSINESS_WHATSAPP_URL = "https://wa.me/15169088319?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20with%20construction%20materials."
const HIDDEN_PATHS = new Set(["/login", "/signup", "/reset-password", "/homepage-preview"])

export function SiteFooter() {
  const pathname = usePathname()

  if (pathname && (HIDDEN_PATHS.has(pathname) || pathname.startsWith("/admin"))) return null

  return (
    <ShopTranslationBoundary><footer className="border-t border-slate-200 bg-[#eef3f8] px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6 sm:pt-6">
      <div className="mx-auto max-w-[88rem] rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(7,17,38,0.05)] sm:px-6">
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(15rem,1fr)_auto]">
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
          <a href="tel:+15169088319" aria-label="Call or text (516) 908-8319" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[#0E2A4A] transition hover:bg-sky-50 hover:text-[#0066cc] sm:gap-2 sm:px-3">
            <Phone className="h-4 w-4" aria-hidden="true" /><span className="whitespace-nowrap text-[11px] font-semibold sm:text-sm">(516) 908-8319</span>
          </a>
          <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp us" className="group relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#128c7e] text-white transition hover:bg-[#0f7a6e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
            <WhatsAppIcon className="h-5 w-5" />
            <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              WhatsApp us
            </span>
          </a>
        </nav>
        </div>
        <nav aria-label="Policies" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">
          <Link href="/privacy" className="hover:text-[#0066cc]">Privacy</Link>
          <Link href="/terms" className="hover:text-[#0066cc]">Terms</Link>
          <Link href="/returns" className="hover:text-[#0066cc]">Returns</Link>
          <Link href="/delivery-policy" className="hover:text-[#0066cc]">Delivery Policy</Link>
          <Link href="/accessibility" className="hover:text-[#0066cc]">Accessibility</Link>
          <Link href="/shop#shop-faq" className="ml-auto hover:text-[#0066cc]">Ordering FAQ</Link>
        </nav>
      </div>
    </footer></ShopTranslationBoundary>
  )
}

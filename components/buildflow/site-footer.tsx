import Link from "next/link"

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-7 text-center sm:px-6 sm:pb-9 sm:pt-9">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <Link href="/" aria-label="Avantia home" className="inline-flex">
          <AvantiaBuildLockup />
        </Link>
        <p className="mt-3 text-sm font-semibold text-slate-700">You build. We handle the materials.</p>
        <a href="tel:+19292077156" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-[#0E2A4A] transition hover:border-sky-300 hover:bg-sky-50 hover:text-[#0066cc]">
          (929) 207-7156
        </a>
      </div>
    </footer>
  )
}

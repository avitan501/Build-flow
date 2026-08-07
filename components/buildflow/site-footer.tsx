import Link from "next/link"

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-9 text-center sm:px-6 sm:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <Link href="/" aria-label="Avantia home" className="inline-flex">
          <AvantiaBuildLockup compact />
        </Link>
        <a href="tel:+19292077156" className="mt-3 text-xs text-slate-500 transition hover:text-[#0066cc]">
          (929) 207-7156
        </a>
      </div>
    </footer>
  )
}

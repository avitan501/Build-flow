import { ArrowLeft, ArrowRight, MonitorUp } from "lucide-react"
import Link from "next/link"

export function CompanyScreenLauncher({ href }: { href: string }) {
  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6">
    <div className="mx-auto max-w-lg">
      <Link href="/admin/ai-tools" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#0066cc]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Manager Tools
      </Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <MonitorUp className="mb-4 h-8 w-8 text-[#0071e3]" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">Company screen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Carlos’s work browser. Keep Tailscale connected.</p>
        <a href={href} className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#0066cc] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3]">
          Open company screen<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        <p className="mt-3 text-xs leading-5 text-slate-500">Opens here. Use your browser’s Back button to return.</p>
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Management may view this company browser. Personal activity outside it is not shared.</p>
      </section>
    </div>
  </main>
}

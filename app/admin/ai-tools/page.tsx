import { Sparkles } from "lucide-react"

import { requireAdminProfile } from "@/lib/auth"

export default async function AdminAiToolsPage() {
  await requireAdminProfile()

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">AI Tools</h1>
        <section className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-[#0066cc]"><Sparkles className="h-5 w-5" /></span>
          <h2 className="mt-4 text-lg font-bold text-slate-950">No tools configured yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">New Avantia Build AI tools will be organized here.</p>
        </section>
      </div>
    </main>
  )
}

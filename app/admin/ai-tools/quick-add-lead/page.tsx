import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { MobileQuickAddLead } from "@/components/buildflow/mobile-quick-add-lead"
import { requireStaffProfile } from "@/lib/auth"

export default async function QuickAddLeadPage() {
  await requireStaffProfile("customers")
  return <main className="min-h-screen bg-[#f5f5f7] px-3 py-4 text-slate-950 sm:px-6 sm:py-6">
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/ai-tools" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Manager Tools</Link>
      <header className="mb-4 mt-2"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0066cc]">Mobile CRM</p><h1 className="mt-1 text-3xl font-black">Quick Add Lead</h1><p className="mt-1 text-sm leading-6 text-slate-600">This creates a lead, not a client or order.</p></header>
      <MobileQuickAddLead />
    </div>
  </main>
}

import { EstimateConverterTool } from "@/components/buildflow/estimate-converter-tool"
import { requireStaffProfile } from "@/lib/auth"

export default async function EstimateConverterPage() {
  await requireStaffProfile("aiTools")
  return <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><Link href="/admin/ai-tools" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#0066cc] hover:text-sky-800"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Manager Tools</Link><h1 className="mt-2 text-3xl font-bold text-slate-950">Estimate to Proposal Request</h1><div className="mt-5"><EstimateConverterTool /></div></div></main>
}
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

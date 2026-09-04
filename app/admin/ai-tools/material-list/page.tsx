import { MaterialListOrganizer } from "@/components/buildflow/material-list-organizer"
import { requireStaffProfile } from "@/lib/auth"

export default async function MaterialListOrganizerPage() {
  await requireStaffProfile("aiTools")
  return <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">AI Tools</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Material List Organizer</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Collect and organize English or Spanish field notes into editable quantities, units, materials, and confirmations. Nothing is ordered or sent.</p><div className="mt-6"><MaterialListOrganizer /></div></div></main>
}

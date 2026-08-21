import { DailyWorkSummaryForm } from "@/components/buildflow/daily-work-summary"
import { requireManagerPortalProfile } from "@/lib/auth"
import { DAILY_WORK_SUMMARY_PREFIX, parseDailyWorkSummary } from "@/lib/daily-work-summary"
import { SUPPLIER_QUOTE_BUCKET } from "@/lib/supplier-quotes"

type SummaryRow = {
  id: string
  title: string
  details: string | null
  updated_at: string
}

export default async function DailySummaryPage() {
  const { supabase } = await requireManagerPortalProfile()
  const result = await supabase
    .from("manager_goals")
    .select("id,title,details,updated_at")
    .eq("assignee", "carlos")
    .like("details", `${DAILY_WORK_SUMMARY_PREFIX}%`)
    .order("title", { ascending: false })
    .limit(90)
    .returns<SummaryRow[]>()
  const parsed = result.error ? [] : (result.data ?? []).map(parseDailyWorkSummary).filter((entry) => entry !== null)
  const summaries = await Promise.all(parsed.map(async (summary) => ({
    ...summary,
    problemAttachments: await Promise.all(summary.problemAttachments.map(async (attachment) => ({
      ...attachment,
      signedUrl: (await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).createSignedUrl(attachment.path, 1800)).data?.signedUrl ?? null,
    }))),
  })))

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-slate-200 pb-5"><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Manager Portal</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Daily Work Summary</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Carlos records what he completed each day and what still needs follow-up.</p></header>
      <div className="mt-5"><DailyWorkSummaryForm summaries={summaries} /></div>
    </div>
  </main>
}

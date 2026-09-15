import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { DailyWorkSummaryForm } from "@/components/buildflow/daily-work-summary"
import { requireManagerPortalProfile } from "@/lib/auth"
import { DAILY_WORK_SUMMARY_PREFIX, parseDailyWorkSummary } from "@/lib/daily-work-summary"
import { SUPPLIER_QUOTE_BUCKET } from "@/lib/supplier-quotes"
import { CarlosPayroll } from "@/components/buildflow/carlos-payroll"
import { CarlosWorkingTogether } from "@/components/buildflow/carlos-working-together"
import type { CarlosPayDay } from "@/lib/carlos-payroll"

type SummaryRow = {
  id: string
  title: string
  details: string | null
  updated_at: string
}

export default async function DailySummaryPage() {
  const { supabase, user } = await requireManagerPortalProfile()
  const email = user.email?.trim().toLowerCase()
  const payroll = await supabase.rpc("carlos_payroll_days")
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
      <header className="border-b border-slate-200 pb-5"><Link href="/admin/build-map" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" />Carlos Dashboard</Link><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Time Log &amp; Daily Summary</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Clock in, pause, resume, and check out. Worked and paused totals use Eastern Time work dates.</p></header>
      <CarlosWorkingTogether />
      <div className="mt-5"><CarlosPayroll days={(payroll.data as CarlosPayDay[]|null)??[]} unavailable={Boolean(payroll.error)} canRequest={email==="buildavantiap@gmail.com"} canMarkPaid={email==="avitanneto@gmail.com"}/><DailyWorkSummaryForm summaries={summaries} canMarkPaid={false} /></div>
    </div>
  </main>
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DavidQuoteGrowthTracker } from "@/components/buildflow/david-quote-growth-tracker";
import { requireManagerPortalProfile } from "@/lib/auth";
import {
  quoteGrowthDateInNewYork,
  type QuoteGrowthMetricRecord,
} from "@/lib/david-quote-growth";
import {
  verifyWebsiteWorkToken,
  WEBSITE_WORK_COOKIE,
} from "@/lib/website-work-access";

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function DavidQuoteChallengePage() {
  const context = await requireManagerPortalProfile();
  if (!context.access.owner) redirect("/admin/goals-progress");
  const cookieStore = await cookies();
  const unlocked = verifyWebsiteWorkToken(
    cookieStore.get(WEBSITE_WORK_COOKIE)?.value,
    context.user.id,
  );
  if (!unlocked) redirect("/admin/goals-progress/website-work");

  const dailyDate = quoteGrowthDateInNewYork();
  const { data: campaignStartData, error: campaignDateError } = await context.supabase
    .from("david_quote_growth_metrics")
    .select("period_start")
    .eq("period_kind", "campaign")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle<{ period_start: string }>();
  if (campaignDateError) throw new Error("The quote challenge could not load.");
  const campaignStart = campaignStartData?.period_start ?? dailyDate;

  const { data, error } = await context.supabase
    .from("david_quote_growth_metrics")
    .select("id,metric_key,period_kind,period_start,label,target_count,actual_count,sort_order,updated_at")
    .or(`and(period_kind.eq.daily,period_start.eq.${dailyDate}),and(period_kind.eq.campaign,period_start.eq.${campaignStart})`)
    .order("sort_order")
    .returns<QuoteGrowthMetricRecord[]>();
  if (error) throw new Error("The quote challenge could not load.");

  const records = data ?? [];
  return (
    <main className="min-h-screen bg-[#f4f6f8] px-3 py-5 text-slate-950 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/goals-progress/website-work" className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />David Dashboard</Link>
        <DavidQuoteGrowthTracker
          dailyRecords={records.filter((record) => record.period_kind === "daily")}
          campaignRecords={records.filter((record) => record.period_kind === "campaign")}
          dailyDate={dailyDate}
          campaignStart={campaignStart}
          campaignEnd={addDays(campaignStart, 29)}
        />
      </div>
    </main>
  );
}

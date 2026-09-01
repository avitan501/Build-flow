"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireManagerPortalProfile } from "@/lib/auth";
import {
  quoteGrowthDateInNewYork,
  quoteGrowthMetricDefinition,
  type QuoteGrowthPeriod,
} from "@/lib/david-quote-growth";
import {
  verifyWebsiteWorkToken,
  WEBSITE_WORK_COOKIE,
} from "@/lib/website-work-access";

export type QuoteGrowthActionResult = { ok: true } | { ok: false; error: string };

async function unlockedOwner() {
  const context = await requireManagerPortalProfile();
  if (!context.access.owner) return null;
  const cookieStore = await cookies();
  const unlocked = verifyWebsiteWorkToken(
    cookieStore.get(WEBSITE_WORK_COOKIE)?.value,
    context.user.id,
  );
  return unlocked ? context : null;
}

export async function updateQuoteGrowthMetricAction(input: {
  metricKey: string;
  period: QuoteGrowthPeriod;
  periodStart?: string;
  actualCount: number;
}): Promise<QuoteGrowthActionResult> {
  const context = await unlockedOwner();
  if (!context) return { ok: false, error: "Unlock David Dashboard first." };

  const definition = quoteGrowthMetricDefinition(input.period, input.metricKey);
  if (!definition) return { ok: false, error: "Choose a valid tracker item." };

  const actualCount = Math.trunc(Number(input.actualCount));
  if (!Number.isFinite(actualCount) || actualCount < 0 || actualCount > 100000) {
    return { ok: false, error: "Enter a valid number." };
  }

  const periodStart = input.period === "daily"
    ? quoteGrowthDateInNewYork()
    : String(input.periodStart ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) {
    return { ok: false, error: "The campaign date is missing." };
  }

  const { error } = await context.supabase
    .from("david_quote_growth_metrics")
    .upsert({
      metric_key: definition.key,
      period_kind: input.period,
      period_start: periodStart,
      label: definition.label,
      target_count: definition.target,
      actual_count: actualCount,
      sort_order: definition.order,
      updated_at: new Date().toISOString(),
      updated_by: context.user.id,
    }, { onConflict: "metric_key,period_kind,period_start" });

  if (error) return { ok: false, error: "Progress could not be saved." };
  revalidatePath("/admin/goals-progress/website-work/quote-challenge");
  revalidatePath("/admin/goals-progress/website-work");
  return { ok: true };
}

import { ArrowLeft, Bot, Check, LayoutDashboard, LockKeyhole, RotateCcw, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  deletePhoneIntakeAction,
  lockWebsiteWorkAction,
  routePhoneIntakeTaskAction,
} from "@/app/admin/goals-progress/website-work/actions";
import { reviewTrustedSmsIntakeAction } from "@/app/owner/aura/actions";
import {
  DavidDashboardBoard,
  type DavidDashboardItem,
} from "@/components/buildflow/david-dashboard-board";
import { WebsiteWorkPinForm } from "@/components/buildflow/website-work-pin-form";
import { requireManagerPortalProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  verifyWebsiteWorkToken,
  WEBSITE_WORK_COOKIE,
} from "@/lib/website-work-access";

type PhoneIntake = {
  id: string;
  message_text: string | null;
  proposal: { summary?: string; recordType?: string; missingInformation?: string[] } | null;
  status: string;
  ai_model: string | null;
  created_at: string;
};

function PhoneIntakeList({ intakes }: { intakes: PhoneIntake[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-sky-100 bg-sky-50 px-4 py-3">
        <Bot className="h-4 w-4 text-[#0066cc]" />
        <h2 className="min-w-0 flex-1 text-sm font-bold">Phone Intake</h2>
        <span className="text-xs font-semibold text-sky-700">{intakes.length}</span>
      </header>
      <div className="divide-y divide-slate-100">
        {intakes.map((intake) => (
          <article key={intake.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-950">{intake.proposal?.summary || intake.message_text || "Phone instruction"}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{intake.proposal?.recordType || "task"}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><Check className="h-3 w-3" />AI reviewed</span>
              </div>
              {intake.message_text && intake.message_text !== intake.proposal?.summary ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{intake.message_text}</p> : null}
              {intake.proposal?.missingInformation?.length ? <p className="mt-1 text-xs font-semibold text-amber-700">Check: {intake.proposal.missingInformation.join(" · ")}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={reviewTrustedSmsIntakeAction}><input type="hidden" name="intakeId" value={intake.id} /><button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600" aria-label="Review again with AI" title="Review again with AI"><RotateCcw className="h-4 w-4" /></button></form>
              <form action={routePhoneIntakeTaskAction}><input type="hidden" name="intakeId" value={intake.id} /><input type="hidden" name="destination" value="david" /><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold"><Send className="h-3.5 w-3.5" />To David</button></form>
              <form action={routePhoneIntakeTaskAction}><input type="hidden" name="intakeId" value={intake.id} /><input type="hidden" name="destination" value="carlos" /><button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-3 text-xs font-bold text-white"><Send className="h-3.5 w-3.5" />To Carlos</button></form>
              <form action={deletePhoneIntakeAction}><input type="hidden" name="intakeId" value={intake.id} /><button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 text-rose-600" aria-label="Delete phone intake" title="Delete"><Trash2 className="h-4 w-4" /></button></form>
            </div>
          </article>
        ))}
        {!intakes.length ? <p className="px-4 py-6 text-center text-sm text-slate-500">No phone tasks waiting.</p> : null}
      </div>
    </section>
  );
}

export default async function DavidDashboardPage() {
  const { user, access } = await requireManagerPortalProfile();
  if (!access.owner) redirect("/admin/goals-progress");
  const cookieStore = await cookies();
  const unlocked = verifyWebsiteWorkToken(
    cookieStore.get(WEBSITE_WORK_COOKIE)?.value,
    user.id,
  );

  if (!unlocked) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#f5f5f7] px-4 py-10">
        <WebsiteWorkPinForm />
      </main>
    );
  }

  const supabase = await createClient();
  const [{ data, error }, { data: intakeData, error: intakeError }] = await Promise.all([
    supabase
      .from("website_work_items")
      .select("id,task_key,title,category,status,assigned_agent,progress_percent,summary,next_step,resolution_cost,updated_at,source_chat_title,item_kind,published_to_carlos")
      .not("status", "in", "(completed,superseded,archived)")
      .order("priority")
      .order("sort_order")
      .order("updated_at", { ascending: false })
      .returns<DavidDashboardItem[]>(),
    supabase
      .from("aura_intakes")
      .select("id,message_text,proposal,status,ai_model,created_at")
      .eq("source", "sms")
      .eq("sender_phone", "+13475675077")
      .in("status", ["pending", "needs_follow_up", "failed"])
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<PhoneIntake[]>(),
  ]);
  if (error) throw new Error("David Dashboard could not load.");
  if (intakeError) console.error("david_phone_intake_load_failed", { code: intakeError.code });

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 py-5 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <Link
              href="/admin/goals-progress"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Carlos Dashboard
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0066cc]">
                  Private owner board
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  David Dashboard
                </h1>
              </div>
            </div>
          </div>
          <form action={lockWebsiteWorkAction}>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">
              <LockKeyhole className="h-3.5 w-3.5" />
              Lock
            </button>
          </form>
        </header>
        <div className="mt-5 grid gap-5">
          <PhoneIntakeList intakes={intakeData ?? []} />
          <DavidDashboardBoard items={data ?? []} />
        </div>
      </div>
    </main>
  );
}

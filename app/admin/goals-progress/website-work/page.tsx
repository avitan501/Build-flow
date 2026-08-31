import { ArrowLeft, LayoutDashboard, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { lockWebsiteWorkAction } from "@/app/admin/goals-progress/website-work/actions";
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
  const { data, error } = await supabase
    .from("website_work_items")
    .select(
      "id,task_key,title,category,status,assigned_agent,progress_percent,summary,next_step,updated_at,source_chat_title,item_kind,published_to_carlos",
    )
    .not("status", "in", "(completed,superseded,archived)")
    .order("priority")
    .order("sort_order")
    .order("updated_at", { ascending: false })
    .returns<DavidDashboardItem[]>();
  if (error) throw new Error("David Dashboard could not load.");

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
            <p className="mt-2 text-sm text-slate-600">
              Every task stays here. Show Carlos controls his dashboard.
            </p>
          </div>
          <form action={lockWebsiteWorkAction}>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">
              <LockKeyhole className="h-3.5 w-3.5" />
              Lock
            </button>
          </form>
        </header>
        <div className="mt-5">
          <DavidDashboardBoard items={data ?? []} />
        </div>
      </div>
    </main>
  );
}

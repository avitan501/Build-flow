import { ArrowLeft, LockKeyhole, NotebookPen } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lockWebsiteWorkAction } from "../actions";
import { requireManagerPortalProfile } from "@/lib/auth";
import { verifyWebsiteWorkToken, WEBSITE_WORK_COOKIE } from "@/lib/website-work-access";
import { personalWorkspaceItem, type PersonalDashboardTask } from "@/lib/personal-dashboard";
import { DashboardTaskWorkspace } from "@/components/buildflow/dashboard-task-workspace";
import { WebsiteWorkPinForm } from "@/components/buildflow/website-work-pin-form";

export default async function PersonalDashboardPage() {
  const { user, profile, access, supabase } = await requireManagerPortalProfile();
  if (!access.owner) redirect("/admin/goals-progress");
  const cookieStore = await cookies();
  if (!verifyWebsiteWorkToken(cookieStore.get(WEBSITE_WORK_COOKIE)?.value, user.id)) {
    return <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#f5f5f7] px-4 py-10"><WebsiteWorkPinForm /></main>;
  }

  const tasks: PersonalDashboardTask[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("personal_dashboard_tasks")
      .select("id,title,summary,next_step,status,updated_at")
      .eq("owner_id", user.id).order("created_at").order("id")
      .range(offset, offset + 499).returns<PersonalDashboardTask[]>();
    if (error) throw new Error("Your personal tasks could not load. Please try again.");
    tasks.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }

  return <main className="min-h-screen bg-[#f5f5f7] px-3 py-5 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link href="/admin/goals-progress/website-work" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> David Dashboard</Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><NotebookPen className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0066cc]">Personal tasks · Only you</p>
              <h1 dir="rtl" lang="he" className="text-2xl font-semibold tracking-tight sm:text-3xl">משימות פרטיות</h1>
            </div>
          </div>
        </div>
        <form action={lockWebsiteWorkAction}><button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><LockKeyhole className="h-3.5 w-3.5" /> Lock</button></form>
      </header>
      <div className="mt-5 min-w-0">
        <DashboardTaskWorkspace items={tasks.map(personalWorkspaceItem)} userName={profile?.full_name || "My workspace"} userId={user.id} scope="personal" />
      </div>
    </div>
  </main>;
}

import Link from "next/link";

import { changeUserRole, approvePendingUser, rejectUser, suspendUser } from "@/app/admin/users/actions";
import { requireSignedInProfile } from "@/lib/auth";

const roleOptions = ["admin", "staff", "client"] as const;

function badgeTone(value: string) {
  if (value === "approved" || value === "admin") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  if (value === "pending" || value === "staff") return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  if (value === "suspended") return "border-slate-400/25 bg-slate-400/10 text-slate-100";
  if (value === "rejected") return "border-rose-400/25 bg-rose-400/10 text-rose-100";
  return "border-white/15 bg-white/10 text-white";
}

export default async function AdminUsersPage() {
  const { supabase, profile } = await requireSignedInProfile();

  if (!profile || profile.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              BuildFlow Supply
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Access denied</h1>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Only admin accounts can view user approvals and role-management controls.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, phone, role, approval_status, is_active, created_at")
    .order("created_at", { ascending: false });

  const { data: recentActions } = await supabase
    .from("approval_actions")
    .select("user_id, action, old_role, new_role, old_approval_status, new_approval_status, performed_by, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error("Failed to load admin users list.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow Supply
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin Users</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Signed in as admin: {profile?.email}. Approval actions and role changes are admin-only
            and every action writes to <code>approval_actions</code>.
          </p>
        </div>

        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Total users</div>
            <div className="mt-2 text-2xl font-semibold">{users?.length ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Pending</div>
            <div className="mt-2 text-2xl font-semibold">{(users ?? []).filter((user) => user.approval_status === "pending").length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Suspended</div>
            <div className="mt-2 text-2xl font-semibold">{(users ?? []).filter((user) => user.approval_status === "suspended").length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Quick link</div>
            <Link href="/admin/whatsapp" className="mt-2 inline-flex text-sm text-emerald-300 underline underline-offset-4">Open WhatsApp Draft Inbox</Link>
          </div>
        </div>

        <div className="grid gap-4">
          {(users ?? []).map((user) => {
            const isSelf = user.id === profile?.id;

            return (
              <article key={user.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{user.full_name || user.email}</h2>
                    <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Company: {user.company_name || "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">Phone: {user.phone || "Not set"}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-xs uppercase tracking-[0.16em]">
                    <span className={`rounded-full border px-3 py-1 ${badgeTone(user.role)}`}>
                      {user.role}
                    </span>
                    <span className={`rounded-full border px-3 py-1 ${badgeTone(user.approval_status)}`}>
                      {user.approval_status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">Active: {user.is_active ? "Yes" : "No"}</span>
                    {isSelf ? <span className="text-amber-300">Current admin account</span> : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
                      Approval actions
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={approvePendingUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          disabled={isSelf || user.approval_status === "approved"}
                          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Approve
                        </button>
                      </form>

                      <form action={rejectUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          disabled={isSelf || user.approval_status === "rejected"}
                          className="rounded-full bg-rose-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </form>

                      <form action={suspendUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          disabled={isSelf || user.approval_status === "suspended"}
                          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Suspend
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
                      Change role
                    </h3>
                    <form action={changeUserRole} className="mt-4 flex flex-wrap items-center gap-3">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={isSelf}
                        className="rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isSelf}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save role
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recent approval audit</h2>
              <p className="mt-1 text-sm text-slate-400">Latest approval and role actions from <code>approval_actions</code>.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {(recentActions ?? []).length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">No recent approval actions found.</div>
            ) : (
              (recentActions ?? []).map((action, index) => (
                <div key={`${action.user_id}-${action.created_at}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium">{action.action}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{action.created_at ? new Date(action.created_at).toLocaleString() : "recent"}</div>
                  </div>
                  <div className="mt-2 text-slate-400">
                    User: {action.user_id} · old role: {action.old_role ?? "-"} · new role: {action.new_role ?? "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

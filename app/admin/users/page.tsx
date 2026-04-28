import Link from "next/link";

import { PageStatusHeader } from "@/components/buildflow/wireframe";
import { changeUserRole, approvePendingUser, rejectUser, suspendUser } from "@/app/admin/users/actions";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

const roleOptions = ["admin", "staff", "client"] as const;

function badgeTone(value: string) {
  if (value === "approved" || value === "admin") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "pending" || value === "staff") return "border-orange-200 bg-orange-50 text-orange-700";
  if (value === "suspended") return "border-slate-200 bg-slate-100 text-slate-600";
  if (value === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-white text-slate-700";
}

export default async function AdminUsersPage() {
  const { supabase, profile } = await requireSignedInProfile();
  const { specMap } = getBuildflowWireframeData();
  const spec = specMap.get("admin-users");

  if (!profile || profile.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-6 py-16 text-slate-900 sm:px-10">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-red-200 bg-red-50 p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">BuildFlow Supply</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Access denied</h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">Only admin accounts can view user approvals and role-management controls.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!spec) {
    throw new Error("Missing admin users wireframe spec.");
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
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageStatusHeader
          title={spec.title}
          purpose={spec.purpose}
          status={spec.status}
          progress={spec.progress}
          missing={spec.missing}
          nextStep={spec.nextStep}
        />

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Total users</div>
            <div className="mt-2 text-2xl font-semibold">{users?.length ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Pending</div>
            <div className="mt-2 text-2xl font-semibold">{(users ?? []).filter((user) => user.approval_status === "pending").length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Suspended</div>
            <div className="mt-2 text-2xl font-semibold">{(users ?? []).filter((user) => user.approval_status === "suspended").length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Quick links</div>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <Link href="/admin/whatsapp" className="text-slate-800 underline underline-offset-4">WhatsApp Inbox</Link>
              <Link href="/admin/build-map" className="text-slate-800 underline underline-offset-4">Back to Build Map</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {(users ?? []).map((user) => {
            const isSelf = user.id === profile?.id;

            return (
              <article key={user.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{user.full_name || user.email}</h2>
                    <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-600">Company: {user.company_name || "Not set"}</p>
                    <p className="mt-1 text-sm text-slate-600">Phone: {user.phone || "Not set"}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-xs uppercase tracking-[0.16em]">
                    <span className={`rounded-full border px-3 py-1 ${badgeTone(user.role)}`}>{user.role}</span>
                    <span className={`rounded-full border px-3 py-1 ${badgeTone(user.approval_status)}`}>{user.approval_status}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">Active: {user.is_active ? "Yes" : "No"}</span>
                    {isSelf ? <span className="text-orange-700">Current admin account</span> : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Approval actions</h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={approvePendingUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" disabled={isSelf || user.approval_status === "approved"} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                          Approve
                        </button>
                      </form>

                      <form action={rejectUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" disabled={isSelf || user.approval_status === "rejected"} className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                          Reject
                        </button>
                      </form>

                      <form action={suspendUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" disabled={isSelf || user.approval_status === "suspended"} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                          Suspend
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Change role</h3>
                    <form action={changeUserRole} className="mt-4 flex flex-wrap items-center gap-3">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} disabled={isSelf} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button type="submit" disabled={isSelf} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        Save role
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recent approval audit</h2>
              <p className="mt-1 text-sm text-slate-500">Latest approval and role actions from approval_actions.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {(recentActions ?? []).length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent approval actions found.</div>
            ) : (
              (recentActions ?? []).map((action, index) => (
                <div key={`${action.user_id}-${action.created_at}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{action.action}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{action.created_at ? new Date(action.created_at).toLocaleString() : "recent"}</div>
                  </div>
                  <div className="mt-2 text-slate-600">User: {action.user_id} · old role: {action.old_role ?? "-"} · new role: {action.new_role ?? "-"}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

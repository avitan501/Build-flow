import { requireAdminProfile } from "@/lib/auth";

export default async function AdminUsersPage() {
  const { supabase, profile } = await requireAdminProfile();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, phone, role, approval_status, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load admin users list.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow Supply
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin Users</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Signed in as admin: {profile?.email}. This page is admin-only.
          </p>
        </div>

        <div className="grid gap-4">
          {(users ?? []).map((user) => (
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
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white">
                    {user.role}
                  </span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                    {user.approval_status}
                  </span>
                  <span className="text-slate-400">Active: {user.is_active ? "Yes" : "No"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

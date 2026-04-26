const pendingUsers = [
  {
    name: "New Client Account",
    role: "Client",
    status: "Pending",
    note: "Staff may approve this user later. Only Admin may reject, suspend, or change roles.",
  },
  {
    name: "Builder Team Invite",
    role: "Client",
    status: "Pending",
    note: "Approval actions will be written to approval_actions once Supabase is connected.",
  },
];

export default function AdminUsersPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Step 1 Placeholder
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin Users Approval</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            This page is reserved for the approval queue. Real admin and staff permission checks are not wired yet.
          </p>
        </div>

        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <article key={user.name} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  <p className="mt-1 text-sm text-slate-300">Role: {user.role}</p>
                </div>
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                  {user.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{user.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

import { requireSignedInProfile } from "@/lib/auth";

type StatusVariant = "pending" | "approved" | "rejected" | "suspended";

const statusCopy: Record<
  StatusVariant,
  {
    badge: string;
    title: string;
    body: string;
    className: string;
  }
> = {
  pending: {
    badge: "Pending Approval",
    title: "Your account is pending approval",
    body: "You can sign in and use the dashboard, but no supplier order can be sent until Admin approval is complete.",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-50",
  },
  approved: {
    badge: "Approved",
    title: "Your account is approved",
    body: "Full dashboard actions can be enabled in the next step.",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-50",
  },
  rejected: {
    badge: "Rejected",
    title: "Your account was rejected",
    body: "Please contact support or an administrator for the next step.",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-50",
  },
  suspended: {
    badge: "Suspended",
    title: "Your account is suspended",
    body: "Please contact support or an administrator for reactivation help.",
    className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
  },
};

const allowedWhilePending = [
  "Browse catalog later",
  "Upload plans later",
  "Start project later",
  "Pay later if needed",
];

const quickActions = [
  {
    href: "/admin/users",
    label: "Admin users",
    description: "Review approvals, suspend users, and manage roles.",
    adminOnly: true,
  },
  {
    href: "/admin/whatsapp",
    label: "WhatsApp Draft Inbox",
    description: "Preview safe draft-only WhatsApp review screens.",
    adminOnly: true,
  },
];

export default async function DashboardPage() {
  const { user, profile } = await requireSignedInProfile();

  const status = (profile?.approval_status ?? "pending") as StatusVariant;
  const banner = statusCopy[status] ?? statusCopy.pending;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow Supply
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Signed in as {user.email}. Company: {profile?.company_name ?? "Not set yet"}.
          </p>
        </div>

        <section className={`rounded-3xl border p-6 ${banner.className}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              {banner.badge}
            </span>
            <span className="text-sm opacity-80">Role: {profile?.role ?? "client"}</span>
            <span className="text-sm opacity-80">Status: {profile?.approval_status ?? "pending"}</span>
            <span className="text-sm opacity-80">
              Active: {profile?.is_active === false ? "No" : "Yes"}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold">{banner.title}</h2>
          <p className="mt-3 text-sm leading-6 opacity-90">{banner.body}</p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Current account</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-300">
              <div>
                <dt className="font-medium text-white">Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Role</dt>
                <dd>{profile?.role ?? "client"}</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Approval status</dt>
                <dd>{profile?.approval_status ?? "pending"}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Available in this step</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {allowedWhilePending.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        </div>

        {profile?.role === "admin" ? (
          <section className="grid gap-4 md:grid-cols-2">
            {quickActions
              .filter((item) => !item.adminOnly || profile?.role === "admin")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/30 hover:bg-white/8"
                >
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                </Link>
              ))}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <Link href="/signup" className="underline underline-offset-4">
            Create another account
          </Link>
          {profile?.role === "admin" ? (
            <Link href="/admin/users" className="underline underline-offset-4">
              Admin users
            </Link>
          ) : null}
          {profile?.role === "admin" ? (
            <Link href="/admin/whatsapp" className="underline underline-offset-4">
              WhatsApp Draft Inbox
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

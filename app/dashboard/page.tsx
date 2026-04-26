import Link from "next/link";

const cards = [
  ["Approval status", "Pending by default until Admin or Staff approves the profile."],
  ["Allowed while pending", "Browse, upload plans later, start project later, and pay later."],
  ["Blocked while pending", "No supplier order can be sent without Admin approval."],
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Step 1 Placeholder
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            This is the planned post-login landing page. Real session checks and role-based content are not connected yet.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(([title, copy]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <Link href="/login" className="underline underline-offset-4">Login placeholder</Link>
          <Link href="/signup" className="underline underline-offset-4">Signup placeholder</Link>
          <Link href="/admin/users" className="underline underline-offset-4">Admin users placeholder</Link>
        </div>
      </section>
    </main>
  );
}

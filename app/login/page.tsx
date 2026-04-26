import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Step 1 Placeholder
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Log in</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This screen is reserved for Supabase email/password login. Real authentication is not connected yet.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/60 p-4 text-sm text-slate-300">
          Planned fields: email, password, forgot password, and redirect to Dashboard after successful login.
        </div>

        <div className="flex flex-col gap-3">
          <button className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950">
            Continue later
          </button>
          <Link href="/signup" className="text-sm text-slate-300 underline underline-offset-4">
            Go to signup placeholder
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";

const highlights = [
  "Draft-first workflow for plans, quotes, and WhatsApp",
  "Admin approval before supplier-facing actions",
  "Mobile-friendly dashboard for approvals and follow-up",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <RecoveryLinkHandler />
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-14 sm:px-10 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
              Live build demo
            </div>
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm text-slate-300">
              BuildFlow Supply
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Construction supply workflow with safer approvals built in.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              BuildFlow prepares supplier quotes, client updates, admin approvals, and draft communication in one cleaner workflow.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Current focus: stable auth, safer admin tools, and WhatsApp draft inbox preparation without live sending.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-full bg-white px-6 py-3 text-center text-sm font-medium text-slate-950 transition hover:bg-slate-200">
                Create account
              </Link>
              <Link href="/login" className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-white/10">
                Log in
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">What this build is preparing</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                {highlights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Safety</div>
                  <div className="mt-2 text-lg font-semibold">Draft-first</div>
                  <p className="mt-2 text-sm text-slate-400">No uncontrolled sending in the WhatsApp workflow.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Admin</div>
                  <div className="mt-2 text-lg font-semibold">Approval-driven</div>
                  <p className="mt-2 text-sm text-slate-400">Role controls and review screens are being prepared for mobile.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

import { getSessionWithProfile } from "@/lib/auth";

export default async function BuildFlowAiPage() {
  const { user } = await getSessionWithProfile();

  return (
    <main className="min-h-screen bg-[#eef3f9] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow AI</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ask BuildFlow AI</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          This AI entry is now live as a real screen so the button works. From here, clients can move into the upload and project flow instead of hitting a dead icon.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/upload" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315a]">
            Upload Plans or Photo
          </Link>
          <Link href={user ? "/dashboard" : "/login"} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white">
            {user ? "Open Dashboard" : "Log in to Continue"}
          </Link>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Best use right now</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>• Start with a project</li>
            <li>• Upload plans or photos</li>
            <li>• Continue into materials, quote, and orders</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

import { getSessionWithProfile } from "@/lib/auth";

export default async function SearchPage() {
  const { user } = await getSessionWithProfile();

  return (
    <main className="min-h-screen bg-[#eef3f9] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow Search</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Search your project flow</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Search is now active. Start from projects, uploads, materials, quotes, and orders from one place.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={user ? "/projects" : "/login"} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315a]">
            {user ? "Open Projects" : "Log in to Search Projects"}
          </Link>
          <Link href="/upload" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white">
            Upload Plans or Photos
          </Link>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">What you can search next</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>• Project names and addresses</li>
            <li>• Uploaded plans and site photos</li>
            <li>• Materials and quote steps</li>
            <li>• Orders and follow-up status</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

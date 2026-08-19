import Link from "next/link";
import { redirect } from "next/navigation";

import { AbcSupplyPricing } from "@/components/buildflow/abc-supply-pricing";
import { requireSignedInProfile } from "@/lib/auth";
import { isApprovedManagerIdentity } from "@/lib/owner-identity";

export default async function AbcAccountPage() {
  const { user, profile } = await requireSignedInProfile();
  const isOwner = isApprovedManagerIdentity({
    email: user.email || profile?.email,
    role: profile?.role,
    approvalStatus: profile?.approval_status,
    isActive: profile?.is_active,
  });
  if (!isOwner) redirect("/account");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <Link href="/account" className="inline-flex text-sm font-semibold text-[#0071e3] hover:text-[#004f9e]">← Account & Settings</Link>
        <section className="rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0071e3]">Avantia Build supplier connection</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">ABC Supply private pricing</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Retrieve account- and branch-specific material pricing securely through ABC’s server-to-server API.</p></div>
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">Automatic API · sandbox</span>
          </div>
        </section>
        <section className="rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <h2 className="text-xl font-semibold text-slate-950">Price a material</h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-slate-600">This owner-only screen uses ABC test accounts today. Real Avantia Build private prices begin after ABC approves and attaches the production customer account.</p>
          <AbcSupplyPricing />
        </section>
      </div>
    </main>
  );
}

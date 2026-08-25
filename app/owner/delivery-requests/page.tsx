import Link from "next/link";

import { DELIVERY_SPEEDS, DELIVERY_VEHICLES } from "@/lib/delivery-pricing";
import { loadDeliveryRequests } from "@/lib/delivery-requests";
import { requireStaffProfile } from "@/lib/auth";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(value));
}

export default async function OwnerDeliveryRequestsPage() {
  await requireStaffProfile("suppliers");
  const requests = await loadDeliveryRequests();

  return (
    <main className="min-h-screen bg-[#f3f6f9] px-4 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] bg-[#10233f] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e2b85a]">Owner delivery desk</p><h1 className="mt-2 text-3xl font-semibold">Delivery requests</h1><p className="mt-2 text-sm text-slate-300">Signed-in requests saved from the website.</p></div><div className="flex gap-2"><Link href="/delivery" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold">Open estimator</Link><Link href="/owner/partnerships" className="rounded-xl bg-[#e2b85a] px-4 py-2.5 text-sm font-bold text-[#10233f]">Carlos suppliers</Link></div></div>
          <div className="mt-6 text-3xl font-semibold">{requests.length}<span className="ml-2 text-sm font-normal text-slate-300">saved requests</span></div>
        </header>
        <div className="mt-5 space-y-3">
          {requests.length ? requests.map((request) => (
            <article key={request.id} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-700">{request.reference} · {request.status}</p><h2 className="mt-1 text-xl font-semibold">{request.storeName} → {request.jobsiteName || request.jobsiteAddress || "Jobsite"}</h2><p className="mt-1 text-sm text-slate-500">{request.customerName} · {request.customerEmail || request.customerPhone || "Signed-in customer"}</p></div><div className="text-right"><p className="text-2xl font-semibold">{money.format(request.estimate.total)}</p><p className="text-xs text-slate-500">Website planning estimate</p></div></div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3"><p><strong className="text-slate-800">Load:</strong> {DELIVERY_VEHICLES[request.vehicle as keyof typeof DELIVERY_VEHICLES]?.label || request.vehicle}</p><p><strong className="text-slate-800">Timing:</strong> {DELIVERY_SPEEDS[request.speed as keyof typeof DELIVERY_SPEEDS]?.label || request.speed}</p><p><strong className="text-slate-800">Created:</strong> {dateLabel(request.createdAt)}</p><p className="sm:col-span-3"><strong className="text-slate-800">Pickup:</strong> {request.pickupAddress || request.pickupCoordinates}</p><p className="sm:col-span-3"><strong className="text-slate-800">Drop-off:</strong> {request.jobsiteAddress || request.jobsiteCoordinates}</p></div>
            </article>
          )) : <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No signed-in delivery requests yet.</div>}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

import { statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

const journeySteps = [
  "Start Project",
  "Upload Plans",
  "Review Materials",
  "Review Quote",
  "Approve Order",
  "Track Your Order",
] as const;

export default async function OrdersPage() {
  await requireSignedInProfile();
  const { specMap } = getBuildflowWireframeData();
  const orders = specMap.get("orders");
  const quotes = specMap.get("quotes");

  if (!orders || !quotes) {
    throw new Error("Missing BuildFlow order route data.");
  }

  const statusTone = statusClasses(orders.status);
  const isLive = orders.status === "Live";

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client Portal Flow</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{isLive ? "Final Step: Track Your Order" : "Final Step Preview: Track Your Order"}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                {isLive
                  ? "Your order has been approved. You can now track delivery status, vendor updates, and order progress."
                  : "This order-tracking screen is still a preview. Keep the final handoff clear without implying real delivery sync or live vendor updates yet."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Who this page is for: Signed-in client</span>
                <span className={`rounded-full border px-3 py-1 ${statusTone.badge}`}>Order tracking: {orders.status}</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Protected client preview</span>
              </div>
              <div className={`mt-5 rounded-3xl border p-4 text-sm ${statusTone.card} text-slate-900`}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">{isLive ? "Journey complete" : "Preview warning"}</div>
                <p className="mt-2 leading-6">{isLive ? "This is the final client step after approval. Delivery tracking and status visibility should now be the focus." : "Treat this as a wireframe for the final client step. Real order records, delivery milestones, and approval history are still unfinished."}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:min-w-80">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Page status</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{orders.progress}% complete</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${orders.progress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{isLive ? "Final client page · no additional flow step" : "Preview page · real tracking milestones still coming soon"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">6-step client journey</h2>
            <p className="mt-1 text-sm text-slate-500">The signed-in client path ends here with order tracking and progress visibility.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {journeySteps.map((step, index) => (
              <div
                key={step}
                className={`rounded-2xl border px-4 py-4 ${index === journeySteps.length - 1 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {index === journeySteps.length - 1 ? "Final step" : `Step ${index + 1}`}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Order tracking context</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Delivery status</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">Show whether the order is approved, scheduled, in transit, or delivered.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Vendor updates</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">Keep supplier progress visible so the client knows what changed and when.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order progress</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">Make the current milestone and next expected update easy to scan.</p>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Next action</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">There is no additional flow step after this page. Clients can return to their projects or quote review, while unfinished delivery sync stays clearly marked as preview work.</p>
            <div className="mt-5 grid gap-3">
              <Link href="/projects" className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
                Back to Projects
              </Link>
              <Link href="/quotes" className={statusButtonClass(quotes.status, quotes.status === "Coming Soon")}>
                <span>Back to Quote Review</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{quotes.status}</span>
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

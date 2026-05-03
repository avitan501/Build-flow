import Link from "next/link";
import { notFound } from "next/navigation";

import { statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import type { ProjectQuoteRecord, ProjectRecord } from "@/lib/projects";

const journeySteps = [
  "Start Project",
  "Upload Plans",
  "Review Materials",
  "Review Quote",
  "Approve Order",
  "Track Your Order",
] as const;

type OrdersPageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

function formatQuoteStatus(status: ProjectQuoteRecord["status"]) {
  if (status === "approved") return "Approved";
  if (status === "sent") return "Sent";
  if (status === "rejected") return "Rejected";
  if (status === "archived") return "Archived";
  return "Draft";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const projectId = resolvedSearchParams?.projectId?.trim();

  const { specMap } = getBuildflowWireframeData();
  const orders = specMap.get("orders");
  const quotes = specMap.get("quotes");

  if (!orders || !quotes) {
    throw new Error("Missing BuildFlow order route data.");
  }

  const statusTone = statusClasses(orders.status);
  const isLive = orders.status === "Live";

  if (!projectId) {
    await requireSignedInProfile();

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

  const { supabase, user } = await requireSignedInProfile();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>();

  if (projectError || !project) {
    notFound();
  }

  const { data: quotesData, error: quotesError } = await supabase
    .from("project_quotes")
    .select("id, project_id, owner_id, status, subtotal, tax, total, notes, created_at, updated_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<ProjectQuoteRecord[]>();

  if (quotesError) {
    throw new Error("Failed to load project quotes.");
  }

  const projectQuotes = quotesData ?? [];
  const approvedQuotes = projectQuotes.filter((quote) => quote.status === "approved");
  const latestApprovedQuote = approvedQuotes.at(-1) ?? null;

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Orders</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{project.name}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Read-only order handoff shell for this selected project. Real order creation and delivery tracking are still disabled.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Project-aware orders</span>
                <span className={`rounded-full border px-3 py-1 ${statusTone.badge}`}>Actions: {orders.status}</span>
              </div>
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Back to Project Workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Selected project</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project name</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.name}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Approved quotes</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{approvedQuotes.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.address || "No address added yet."}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Order status</h2>
            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <div className="text-xs font-semibold uppercase tracking-[0.16em]">No order created yet</div>
              <p className="mt-3 text-sm leading-6">Orders will activate after a quote is approved.</p>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {latestApprovedQuote
                ? `Latest approved quote total: ${formatCurrency(latestApprovedQuote.total)}. Order creation is still disabled for now.`
                : "No approved quote is available yet for this project. Order creation stays disabled until a quote is approved."}
            </div>
          </article>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Quote readiness</h2>
              <p className="mt-1 text-sm text-slate-500">Existing quote records are visible here so the future order activation stays honest and project-specific.</p>
            </div>
            <Link
              href={`/quotes?projectId=${project.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Back to Quote Review
            </Link>
          </div>

          {projectQuotes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No quote prepared yet for this project.</div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {projectQuotes.map((quote, index) => (
                <div key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Quote {index + 1}</div>
                      <div className="mt-1 text-sm text-slate-600">Status: {formatQuoteStatus(quote.status)}</div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {formatCurrency(quote.total)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">{quote.notes?.trim() ? quote.notes : "No quote notes added yet."}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Order actions</h2>
          <p className="mt-1 text-sm text-slate-500">Actions stay disabled until the real order table and write flow are activated.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Create order</div>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-400 opacity-80"
              >
                Coming Soon
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Approve order</div>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-400 opacity-80"
              >
                Coming Soon
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Track delivery</div>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-400 opacity-80"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

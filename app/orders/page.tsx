import Link from "next/link";
import { notFound } from "next/navigation";

import { createOrderFromApprovedQuoteAction } from "@/app/orders/actions";
import { statusButtonClass, statusClasses } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import type { ProjectOrderRecord, ProjectQuoteRecord, ProjectRecord } from "@/lib/projects";
import { formatSiteDate } from "@/lib/site-date-time";

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
    error?: string;
    success?: string;
  }>;
};

const orderStatusMessages = {
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "quote-not-found": { tone: "error", text: "We could not confirm that approved quote for this project." },
  "quote-not-approved": { tone: "error", text: "Only approved quotes can create an order." },
  "quote-total-invalid": { tone: "error", text: "Approved quote total must be greater than zero before creating an order." },
  "order-check-failed": { tone: "error", text: "Existing order status could not be checked. Please try again." },
  "order-create-failed": { tone: "error", text: "Order could not be created from this approved quote. Please try again." },
  "order-pdf-items-failed": { tone: "error", text: "Quote items could not be loaded for the order PDF. Please try again." },
  "order-pdf-upload-failed": { tone: "error", text: "Order was not completed because the PDF copy could not be uploaded. Please try again." },
  "order-pdf-record-failed": { tone: "error", text: "Order was not completed because the project PDF record could not be saved. Please try again." },
  "order-created": { tone: "success", text: "Order created successfully. A PDF copy was saved in the project documents." },
  "order-already-exists": { tone: "success", text: "An order already exists for this approved quote. The project documents contain the saved PDF copy." },
} as const;

function formatQuoteStatus(status: ProjectQuoteRecord["status"]) {
  if (status === "approved") return "Approved";
  if (status === "sent") return "Sent";
  if (status === "rejected") return "Rejected";
  if (status === "archived") return "Archived";
  return "Draft";
}

function formatOrderStatus(status: ProjectOrderRecord["status"]) {
  if (status === "approved") return "Approved";
  if (status === "ordered") return "Ordered";
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  if (status === "archived") return "Archived";
  return "Draft";
}

function formatTrackingStatus(status: ProjectOrderRecord["tracking_status"]) {
  if (status === "not_started") return "Not started";
  if (status === "in_delivery") return "In delivery";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatOrderDate(value: string) {
  return formatSiteDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const errorCode = resolvedSearchParams?.error?.trim();
  const successCode = resolvedSearchParams?.success?.trim();

  const { specMap } = getBuildflowWireframeData();
  const orders = specMap.get("orders");
  const quotes = specMap.get("quotes");

  if (!orders || !quotes) {
    throw new Error("Missing Avantia Build order route data.");
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

  const { data: ordersData, error: ordersError } = await supabase
    .from("project_orders")
    .select("id, project_id, owner_id, quote_id, status, tracking_status, total, notes, created_at, updated_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<ProjectOrderRecord[]>();

  if (ordersError) {
    throw new Error("Failed to load project orders.");
  }

  const projectQuotes = quotesData ?? [];
  const projectOrders = ordersData ?? [];
  const approvedQuotes = projectQuotes.filter((quote) => quote.status === "approved");
  const latestApprovedQuote = approvedQuotes.at(-1) ?? null;
  const ordersByQuoteId = new Map(projectOrders.filter((order) => order.quote_id).map((order) => [order.quote_id as string, order]));
  const feedback = (successCode && orderStatusMessages[successCode as keyof typeof orderStatusMessages]) || (errorCode && orderStatusMessages[errorCode as keyof typeof orderStatusMessages]);
  const activeOrders = projectOrders.filter((order) => order.status !== "delivered" && order.status !== "cancelled" && order.status !== "archived");
  const pastOrders = projectOrders.filter((order) => !activeOrders.includes(order));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_45%,#eef4fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:py-6 sm:pb-10 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,255,0.94))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Orders</p>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.7rem]">{project.name}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Track active orders, review past ones, and create a new order from an approved quote when needed.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">{projectOrders.length} order{projectOrders.length === 1 ? "" : "s"}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{activeOrders.length} active</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Project orders</span>
              </div>
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition hover:bg-slate-50"
            >
              Back to Project
            </Link>
          </div>
        </section>

        {feedback ? (
          <section
            className={`rounded-[24px] border p-4 text-sm ${
              feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">{feedback.tone === "success" ? "Saved" : "Order issue"}</div>
            <p className="mt-1.5 leading-6">{feedback.text}</p>
            {feedback.tone === "success" && (successCode === "order-created" || successCode === "order-already-exists") ? (
              <Link
                href={`/projects/${project.id}#documents`}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Open saved PDF
              </Link>
            ) : null}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Overview</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Approved quotes</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{approvedQuotes.length}</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest approved total</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{latestApprovedQuote ? formatCurrency(latestApprovedQuote.total) : "Not available"}</div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                <div className="mt-2 text-sm leading-6 font-semibold text-slate-900">{project.address || "No address added yet."}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Tracking</h2>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone.badge}`}>{orders.status}</span>
            </div>
            <div className="mt-4 space-y-3">
              {activeOrders.length > 0 ? activeOrders.slice(0, 2).map((order, index) => (
                <div key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Order {index + 1}</div>
                      <div className="mt-1 text-sm text-slate-600">{formatTrackingStatus(order.tracking_status)}</div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{formatOrderStatus(order.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href="#active-orders" className="inline-flex items-center justify-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">Track order</a>
                    <Link href={`/quotes?projectId=${project.id}`} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View details</Link>
                    <Link href={`/projects/${project.id}#documents`} className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">Open PDF</Link>
                  </div>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">Active orders will appear here once an order is created.</div>
              )}
            </div>
          </article>
        </section>

        <section id="active-orders" className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Active orders</h2>
              <p className="text-sm text-slate-500">Current and in-progress orders.</p>
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">No active orders yet.</div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {activeOrders.map((order, index) => (
                <article key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Order {index + 1}</div>
                      <div className="mt-1 text-sm text-slate-600">Created {formatOrderDate(order.created_at)}</div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{formatOrderStatus(order.status)}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tracking</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatTrackingStatus(order.tracking_status)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Summary</div>
                      <div className="mt-1 text-sm leading-6 text-slate-700">{order.notes?.trim() ? order.notes : "Order created from an approved quote. Details will expand here as more order data becomes available."}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="#tracking-actions" className="inline-flex items-center justify-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">Track order</a>
                    <Link href={`/quotes?projectId=${project.id}`} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View details</Link>
                    <Link href={`/projects/${project.id}#documents`} className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">Open PDF</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="create-order" className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Past orders</h2>
              <p className="text-sm text-slate-500">Completed and archived orders.</p>
            </div>
            <Link
              href={`/quotes?projectId=${project.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Quote Review
            </Link>
          </div>

          {pastOrders.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">Past orders will appear here after delivery or completion.</div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {pastOrders.map((order, index) => (
                <article key={order.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Past order {index + 1}</div>
                      <div className="mt-1 text-sm text-slate-600">{formatOrderDate(order.updated_at)}</div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{formatOrderStatus(order.status)}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tracking</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatTrackingStatus(order.tracking_status)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/quotes?projectId=${project.id}`} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reorder</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Create from approved quote</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quotes</span>
          </div>

          {approvedQuotes.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">No approved quote is ready for order creation yet.</div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {approvedQuotes.map((quote, index) => {
                const order = ordersByQuoteId.get(quote.id);
                return (
                  <div key={quote.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Approved quote {index + 1}</div>
                        <div className="mt-1 text-sm text-slate-600">{formatQuoteStatus(quote.status)}</div>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{formatCurrency(quote.total)}</span>
                    </div>

                    <div className="mt-3 text-sm leading-6 text-slate-600">{quote.notes?.trim() ? quote.notes : "Approved quote ready for order creation."}</div>

                    {order ? (
                      <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Order already created</div>
                        <div className="mt-1.5">Status: {formatOrderStatus(order.status)}</div>
                        <div className="mt-1">Tracking: {formatTrackingStatus(order.tracking_status)}</div>
                      </div>
                    ) : (
                      <form action={createOrderFromApprovedQuoteAction} className="mt-4 grid gap-3 rounded-[20px] border border-slate-200 bg-white p-4">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-900">Order notes</span>
                          <textarea
                            name="notes"
                            rows={3}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                            placeholder="Optional notes"
                            defaultValue={quote.notes || ""}
                          />
                        </label>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                        >
                          Create order
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section id="tracking-actions" className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.10)] sm:p-6">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Tracking actions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Track order</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use the active order cards above to review current delivery status.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">View details</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Open the related quote view for pricing and source details.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contact support</div>
              <Link href={`/projects/${project.id}`} className="mt-3 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Back to project
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

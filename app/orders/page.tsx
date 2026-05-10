import { notFound } from "next/navigation";

import { createOrderFromApprovedQuoteAction } from "@/app/orders/actions";
import { PremiumBackLink, PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectOrderRecord, ProjectQuoteRecord, ProjectRecord } from "@/lib/projects";

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
  "order-created": { tone: "success", text: "Order created successfully from the approved quote." },
  "order-already-exists": { tone: "success", text: "An order already exists for this approved quote." },
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

  if (!projectId) {
    await requireSignedInProfile();
    return (
      <PremiumPageShell>
        <PremiumHero
          eyebrow="Orders"
          title="Orders"
          description="Open this page from a project workspace to create or review orders for a specific project."
          badges={
            <>
              <PremiumBadge tone="amber">Partial Live</PremiumBadge>
            </>
          }
          aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>}
        />
      </PremiumPageShell>
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

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Orders"
        title={project.name}
        description="Create an order from an approved quote, then review the clearest order status available today."
        badges={
          <>
            <PremiumBadge tone="amber">Partial Live</PremiumBadge>
            <PremiumBadge>Project linked</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href={`/projects/${project.id}`}>Back to Project Workspace</PremiumBackLink>}
      />

      {feedback ? (
        <PremiumMutedPanel tone={feedback.tone === "success" ? "emerald" : "rose"}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]">{feedback.tone === "success" ? "Saved" : "Order issue"}</div>
          <p className="mt-2 leading-6">{feedback.text}</p>
        </PremiumMutedPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title="Selected project" description="Keep the order context visible while reviewing approvals.">
          <div className="grid gap-4 sm:grid-cols-2">
            <PremiumInfoCard label="Project name" value={project.name} />
            <PremiumInfoCard label="Approved quotes" value={approvedQuotes.length} />
            <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
          </div>
        </PremiumSection>

        <PremiumSection title="Current order status" description="See the clearest current state before delivery tracking expands further.">
          <PremiumMutedPanel tone={projectOrders.length > 0 ? "emerald" : "amber"}>
            <div className="text-xs font-semibold uppercase tracking-[0.16em]">{projectOrders.length > 0 ? `${projectOrders.length} order${projectOrders.length === 1 ? "" : "s"} created` : "No order created yet"}</div>
            <p className="mt-2 leading-6">{projectOrders.length > 0 ? "Orders linked to approved quotes appear below." : "Order creation becomes available after a quote is approved with pricing in place."}</p>
          </PremiumMutedPanel>
          <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600 shadow-[0_8px_18px_rgba(148,163,184,0.06)]">{latestApprovedQuote ? `Latest approved quote total: ${formatCurrency(latestApprovedQuote.total)}.` : "No approved quote is available yet for this project."}</div>
        </PremiumSection>
      </div>

      <PremiumSection title="Approved quotes" description="Create one order from an approved quote or review the existing linked order." action={<PremiumBackLink href={`/quotes?projectId=${project.id}`}>Back to Quote Review</PremiumBackLink>}>
        {approvedQuotes.length === 0 ? (
          <PremiumMutedPanel>No approved quote is ready for order creation yet.</PremiumMutedPanel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {approvedQuotes.map((quote, index) => {
              const order = ordersByQuoteId.get(quote.id);
              return (
                <div key={quote.id} className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Approved Quote {index + 1}</div>
                      <div className="mt-1 text-sm text-slate-600">Status: {formatQuoteStatus(quote.status)}</div>
                    </div>
                    <PremiumBadge>{formatCurrency(quote.total)}</PremiumBadge>
                  </div>

                  <div className="mt-3 text-sm text-slate-600">{quote.notes?.trim() ? quote.notes : "No quote notes added yet."}</div>

                  {order ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em]">Order already created</div>
                      <div className="mt-2">Order status: {formatOrderStatus(order.status)}</div>
                      <div className="mt-1">Tracking: {formatTrackingStatus(order.tracking_status)}</div>
                      <div className="mt-1">Order total: {formatCurrency(order.total)}</div>
                    </div>
                  ) : (
                    <form action={createOrderFromApprovedQuoteAction} className="mt-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_18px_rgba(148,163,184,0.06)]">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="quoteId" value={quote.id} />
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-900">Order notes</span>
                        <textarea name="notes" rows={3} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Optional notes to carry into the order" defaultValue={quote.notes || ""} />
                      </label>
                      <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">Create Order</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PremiumSection>
    </PremiumPageShell>
  );
}

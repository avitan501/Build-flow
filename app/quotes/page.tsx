import Link from "next/link";
import { notFound } from "next/navigation";

import { addMaterialsToQuoteAction, approveQuoteAction, createProjectQuoteAction, updateQuoteItemPricingAction } from "@/app/quotes/actions";
import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectQuoteItemRecord, ProjectQuoteRecord, ProjectRecord } from "@/lib/projects";

type QuotesPageProps = {
  searchParams?: Promise<{
    projectId?: string;
    error?: string;
    success?: string;
  }>;
};

const quoteStatusMessages = {
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "quote-create-failed": { tone: "error", text: "Draft quote could not be created. Please try again." },
  "quote-created": { tone: "success", text: "Draft quote created successfully." },
  "quote-not-found": { tone: "error", text: "We could not confirm that draft quote for this project." },
  "quote-not-draft": { tone: "error", text: "Only draft quotes can receive project materials." },
  "quote-items-load-failed": { tone: "error", text: "Existing quote items could not be checked. Please try again." },
  "materials-load-failed": { tone: "error", text: "Project materials could not be loaded. Please try again." },
  "materials-not-found": { tone: "error", text: "No project materials were found to add into this quote." },
  "quote-materials-create-failed": { tone: "error", text: "Materials could not be added to this draft quote. Please try again." },
  "quote-materials-added": { tone: "success", text: "Project materials added to the draft quote." },
  "quote-materials-exist": { tone: "success", text: "Materials already added to this quote." },
  "quote-item-not-found": { tone: "error", text: "We could not confirm that quote item for this draft quote." },
  "quote-item-price-invalid": { tone: "error", text: "Enter a valid unit price of 0 or more." },
  "quote-item-update-failed": { tone: "error", text: "Quote item pricing could not be updated. Please try again." },
  "quote-totals-update-failed": { tone: "error", text: "Quote totals could not be recalculated. Please try again." },
  "quote-item-price-updated": { tone: "success", text: "Quote item pricing updated successfully." },
  "quote-approved": { tone: "success", text: "Quote approved successfully." },
  "quote-approve-status-invalid": { tone: "error", text: "Only draft or sent quotes can be approved." },
  "quote-approve-total-invalid": { tone: "error", text: "Add pricing before approval." },
  "quote-approve-failed": { tone: "error", text: "Quote approval could not be saved. Please try again." },
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuoteStatus(status: ProjectQuoteRecord["status"]) {
  if (status === "approved") return "Approved";
  if (status === "sent") return "Sent";
  if (status === "rejected") return "Rejected";
  if (status === "archived") return "Archived";
  return "Draft";
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const projectId = resolvedSearchParams?.projectId?.trim();
  const errorCode = resolvedSearchParams?.error?.trim();
  const successCode = resolvedSearchParams?.success?.trim();

  if (!projectId) {
    await requireSignedInProfile();
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
        <section className="mx-auto flex max-w-3xl flex-col gap-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quote Review</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quotes</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Open this page from a project workspace.</p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                Back to Projects
              </Link>
            </div>
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

  const { data: quotes, error: quotesError } = await supabase
    .from("project_quotes")
    .select("id, project_id, owner_id, status, subtotal, tax, total, notes, created_at, updated_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<ProjectQuoteRecord[]>();

  if (quotesError) {
    throw new Error("Failed to load project quotes.");
  }

  const quoteIds = (quotes ?? []).map((quote) => quote.id);
  let quoteItems: ProjectQuoteItemRecord[] = [];

  if (quoteIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("project_quote_items")
      .select("id, quote_id, project_id, owner_id, material_id, name, quantity, unit, unit_price, line_total, created_at")
      .in("quote_id", quoteIds)
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .returns<ProjectQuoteItemRecord[]>();

    if (itemsError) {
      throw new Error("Failed to load project quote items.");
    }

    quoteItems = items ?? [];
  }

  const feedback = (successCode && quoteStatusMessages[successCode as keyof typeof quoteStatusMessages]) || (errorCode && quoteStatusMessages[errorCode as keyof typeof quoteStatusMessages]);

  const itemsByQuoteId = new Map<string, ProjectQuoteItemRecord[]>();
  for (const item of quoteItems) {
    const existing = itemsByQuoteId.get(item.quote_id) || [];
    existing.push(item);
    itemsByQuoteId.set(item.quote_id, existing);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quote Review</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{project.name}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Read-only view of prepared quotes for this selected project, with manual draft creation.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Project-aware quotes</span>
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

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Create draft quote</h2>
            <p className="mt-1 text-sm text-slate-500">Create one draft quote shell for this selected project.</p>
            <div className="mt-4 grid gap-3">
              {feedback ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    feedback.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {feedback.tone === "success" ? "Saved" : "Quote issue"}
                  </div>
                  <p className="mt-2 leading-6">{feedback.text}</p>
                </div>
              ) : null}

              <form action={createProjectQuoteAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <label htmlFor="quote-notes" className="text-sm font-semibold text-slate-900">
                    Notes
                  </label>
                  <textarea
                    id="quote-notes"
                    name="notes"
                    rows={4}
                    className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Optional notes for this draft quote"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Create Draft Quote
                </button>
              </form>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Selected project</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project name</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.name}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quotes found</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{quotes.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.address || "No address added yet."}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold">Quotes</h2>
            <p className="mt-1 text-sm text-slate-500">Read-only quote summary for this project.</p>
            {quotes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No quote prepared yet</div>
            ) : (
              <div className="mt-4 grid gap-4">
                {quotes.map((quote, index) => {
                  const items = itemsByQuoteId.get(quote.id) || [];
                  return (
                    <div key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Quote {index + 1}</div>
                          <div className="mt-1 text-sm text-slate-600">Status: {formatQuoteStatus(quote.status)}</div>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {items.length} item{items.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-3 flex flex-wrap gap-3">
                          {quote.status === "draft" ? (
                            items.length === 0 ? (
                              <form action={addMaterialsToQuoteAction}>
                                <input type="hidden" name="projectId" value={project.id} />
                                <input type="hidden" name="quoteId" value={quote.id} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                                >
                                  Add Materials to Quote
                                </button>
                              </form>
                            ) : (
                              <div className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                                Materials already added
                              </div>
                            )
                          ) : null}

                          {quote.status === "draft" || quote.status === "sent" ? (
                            quote.total > 0 ? (
                              <form action={approveQuoteAction}>
                                <input type="hidden" name="projectId" value={project.id} />
                                <input type="hidden" name="quoteId" value={quote.id} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                                >
                                  Approve Quote
                                </button>
                              </form>
                            ) : (
                              <div className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                Add pricing before approval
                              </div>
                            )
                          ) : null}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Subtotal</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(quote.subtotal)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tax</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(quote.tax)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(quote.total)}</div>
                        </div>
                      </div>

                      {quote.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{quote.notes}</p> : null}

                      <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote items</div>
                        {items.length === 0 ? (
                          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">No quote items added yet.</div>
                        ) : (
                          <div className="mt-3 grid gap-3">
                            {items.map((item) => (
                              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                                    <div className="mt-1 text-sm text-slate-600">
                                      {item.quantity !== null ? item.quantity : "—"}
                                      {item.unit ? ` ${item.unit}` : ""}
                                    </div>
                                  </div>
                                  <div className="w-full max-w-sm text-sm text-slate-600 sm:text-right">
                                    <div>{formatCurrency(item.unit_price)} / unit</div>
                                    <div className="mt-1 font-semibold text-slate-900">{formatCurrency(item.line_total)}</div>
                                    {quote.status === "draft" ? (
                                      <form action={updateQuoteItemPricingAction} className="mt-3 grid gap-2 sm:justify-items-end">
                                        <input type="hidden" name="projectId" value={project.id} />
                                        <input type="hidden" name="quoteId" value={quote.id} />
                                        <input type="hidden" name="itemId" value={item.id} />
                                        <label className="grid gap-1 text-left sm:justify-items-end sm:text-right">
                                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Unit price</span>
                                          <input
                                            type="number"
                                            name="unitPrice"
                                            min="0"
                                            step="0.01"
                                            defaultValue={item.unit_price}
                                            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 sm:w-40"
                                          />
                                        </label>
                                        <button
                                          type="submit"
                                          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                                        >
                                          Update pricing
                                        </button>
                                      </form>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}

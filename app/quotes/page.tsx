import { notFound } from "next/navigation"

import { addMaterialsToQuoteAction, approveQuoteAction, createProjectQuoteAction, updateQuoteItemPricingAction } from "@/app/quotes/actions"
import { PremiumBackLink, PremiumBadge, PremiumEmptyState, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumPhotoPanel, PremiumSection } from "@/components/buildflow/premium-page"
import { requireSignedInProfile } from "@/lib/auth"
import type { ProjectQuoteItemRecord, ProjectQuoteRecord, ProjectRecord } from "@/lib/projects"

const quotesImage =
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80"
const quotesEmptyImage =
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80"

type QuotesPageProps = {
  searchParams?: Promise<{
    projectId?: string
    error?: string
    success?: string
  }>
}

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
} as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatQuoteStatus(status: ProjectQuoteRecord["status"]) {
  if (status === "approved") return "Approved"
  if (status === "sent") return "Sent"
  if (status === "rejected") return "Rejected"
  if (status === "archived") return "Archived"
  return "Draft"
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const projectId = resolvedSearchParams?.projectId?.trim()
  const errorCode = resolvedSearchParams?.error?.trim()
  const successCode = resolvedSearchParams?.success?.trim()

  if (!projectId) {
    await requireSignedInProfile()
    return (
      <PremiumPageShell maxWidth="max-w-3xl">
        <PremiumHero eyebrow="Quote review" title="Quotes" description="Open this page from a project workspace to review pricing for a specific project." aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>} />
        <PremiumEmptyState
          image={quotesEmptyImage}
          eyebrow="Project-linked quotes"
          title="Open a project first so pricing stays tied to the right job"
          description="That keeps material items, quote totals, approvals, and future orders connected to the same workspace from start to finish."
          action={<PremiumBackLink href="/projects">Open Projects</PremiumBackLink>}
        />
      </PremiumPageShell>
    )
  }

  const { supabase, user } = await requireSignedInProfile()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>()

  if (projectError || !project) {
    notFound()
  }

  const { data: quotes, error: quotesError } = await supabase
    .from("project_quotes")
    .select("id, project_id, owner_id, status, subtotal, tax, total, notes, created_at, updated_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<ProjectQuoteRecord[]>()

  if (quotesError) {
    throw new Error("Failed to load project quotes.")
  }

  const quoteIds = (quotes ?? []).map((quote) => quote.id)
  let quoteItems: ProjectQuoteItemRecord[] = []

  if (quoteIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("project_quote_items")
      .select("id, quote_id, project_id, owner_id, material_id, name, quantity, unit, unit_price, line_total, created_at")
      .in("quote_id", quoteIds)
      .eq("project_id", project.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .returns<ProjectQuoteItemRecord[]>()

    if (itemsError) {
      throw new Error("Failed to load project quote items.")
    }

    quoteItems = items ?? []
  }

  const feedback = (successCode && quoteStatusMessages[successCode as keyof typeof quoteStatusMessages]) || (errorCode && quoteStatusMessages[errorCode as keyof typeof quoteStatusMessages])

  const itemsByQuoteId = new Map<string, ProjectQuoteItemRecord[]>()
  for (const item of quoteItems) {
    const existing = itemsByQuoteId.get(item.quote_id) || []
    existing.push(item)
    itemsByQuoteId.set(item.quote_id, existing)
  }

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Quote"
        title={project.name}
        description="Review pricing, confirm quote details, and approve when everything looks right."
        badges={
          <>
            <PremiumBadge tone="sky">Live</PremiumBadge>
            <PremiumBadge>Project linked</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href={`/projects/${project.id}`}>Back to Project Workspace</PremiumBackLink>}
      />

      {feedback ? (
        <PremiumMutedPanel tone={feedback.tone === "success" ? "emerald" : "rose"}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]">{feedback.tone === "success" ? "Saved" : "Quote issue"}</div>
          <p className="mt-2 leading-6">{feedback.text}</p>
        </PremiumMutedPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4">
          <PremiumPhotoPanel
            image={quotesImage}
            eyebrow="Quote review"
            title="Turn material review into a calmer, more premium approval step"
            description="The quote experience now feels more intentional, with clean visuals supporting price review instead of competing with it."
            badge={<PremiumBadge tone="amber">Approval-ready</PremiumBadge>}
          />

          <PremiumSection title="Create draft quote" description="Create a draft quote for this project.">
            <form action={createProjectQuoteAction} className="grid gap-4 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.86))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
              <input type="hidden" name="projectId" value={project.id} />
              <div>
                <label htmlFor="quote-notes" className="text-sm font-semibold text-slate-900">Notes</label>
                <textarea id="quote-notes" name="notes" rows={4} className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900" placeholder="Optional notes for this draft quote" />
              </div>
              <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">Create Draft Quote</button>
            </form>
          </PremiumSection>
        </div>

        <PremiumSection title="Selected project" description="Project context stays visible while you review quotes.">
          <div className="grid gap-4 sm:grid-cols-2">
            <PremiumInfoCard label="Project name" value={project.name} />
            <PremiumInfoCard label="Quotes found" value={quotes.length} />
            <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
          </div>
        </PremiumSection>

        <PremiumSection title="Quotes" description="Review pricing, materials, and approval status for this project." className="lg:col-span-2">
          {quotes.length === 0 ? (
            <PremiumEmptyState
              image={quotesEmptyImage}
              eyebrow="No quotes yet"
              title="Create the first quote for this project"
              description="Start with a draft, add project materials, then review pricing in a cleaner space before approval."
            />
          ) : (
            <div className="grid gap-4">
              {quotes.map((quote, index) => {
                const items = itemsByQuoteId.get(quote.id) || []
                return (
                  <div key={quote.id} className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Quote {index + 1}</div>
                        <div className="mt-1 text-sm text-slate-600">Status: {formatQuoteStatus(quote.status)}</div>
                      </div>
                      <PremiumBadge>{items.length} item{items.length === 1 ? "" : "s"}</PremiumBadge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {quote.status === "draft" ? (
                        items.length === 0 ? (
                          <form action={addMaterialsToQuoteAction}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="quoteId" value={quote.id} />
                            <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99]">Add Materials to Quote</button>
                          </form>
                        ) : (
                          <div className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Materials already added</div>
                        )
                      ) : null}

                      {(quote.status === "draft" || quote.status === "sent") && quote.total > 0 ? (
                        <form action={approveQuoteAction}>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="quoteId" value={quote.id} />
                          <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(220,168,69,0.2)] transition active:scale-[0.99]">Approve Quote</button>
                        </form>
                      ) : null}

                      {(quote.status === "draft" || quote.status === "sent") && quote.total <= 0 ? (
                        <div className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Add pricing before approval</div>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <PremiumInfoCard label="Subtotal" value={formatCurrency(quote.subtotal)} />
                      <PremiumInfoCard label="Tax" value={formatCurrency(quote.tax)} />
                      <PremiumInfoCard label="Total" value={formatCurrency(quote.total)} />
                    </div>

                    {quote.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{quote.notes}</p> : null}

                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quote items</div>
                      {items.length === 0 ? (
                        <div className="mt-3"><PremiumMutedPanel>No quote items added yet.</PremiumMutedPanel></div>
                      ) : (
                        <div className="mt-3 grid gap-3">
                          {items.map((item) => (
                            <div key={item.id} className="rounded-[20px] border border-sky-100 bg-white p-3 shadow-[0_8px_18px_rgba(148,163,184,0.06)]">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                                  <div className="mt-1 text-sm text-slate-600">{item.quantity !== null ? item.quantity : "—"}{item.unit ? ` ${item.unit}` : ""}</div>
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
                                        <input type="number" name="unitPrice" min="0" step="0.01" defaultValue={item.unit_price} className="w-full rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 sm:w-40" />
                                      </label>
                                      <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[#0e2341] px-3 py-2 text-sm font-semibold text-white transition active:scale-[0.99]">Update pricing</button>
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
                )
              })}
            </div>
          )}
        </PremiumSection>
      </div>
    </PremiumPageShell>
  )
}

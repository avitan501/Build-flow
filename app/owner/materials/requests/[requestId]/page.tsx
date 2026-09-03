import { notFound } from "next/navigation";
import { CustomerRequestStatus } from "@/components/buildflow/customer-request-status";
import { MaterialRequestAssigneeControl } from "@/components/buildflow/material-request-assignee-control";
import { RequestClientContact } from "@/components/buildflow/request-client-contact";
import { RequestMaterialWorktable, type RequestWorktableComparison } from "@/components/buildflow/request-material-worktable";
import {
  RequestManagementPanel,
  type RequestComparisonSummary,
  type RequestClientDocumentSnapshot,
} from "@/components/buildflow/request-management-panel";
import { requireStaffProfile } from "@/lib/auth";
import { contactEmailForDisplay } from "@/lib/auth-phone";
import { normalizeMaterialCatalogDepartment } from "@/lib/material-catalog";
import type {
  MaterialQuestionnaireResponse,
  MaterialRequestAnswer,
} from "@/lib/material-questionnaires";
import {
  quoteRequestStatusLabel,
  type QuoteRequestStatus,
} from "@/lib/quote-requests";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";
import {
  analyzeQuoteComparison,
  type QuoteComparisonBidRecord,
  type QuoteComparisonItemRecord,
  type QuoteComparisonRecord,
} from "@/lib/quote-comparison";
import { managerPipelineStage } from "@/lib/manager-dashboard";
import { mapRequestSupplierComparison } from "@/lib/request-supplier-comparison";
import { hasPersistedReceiptProof } from "@/lib/request-workflow-state";
import { formatSiteDateTime } from "@/lib/site-date-time";
import { canonicalSupplierDirectory, resolveRequestSupplierRouteSelections } from "@/lib/supplier-canonical";
import type { RelatedEmailItem } from "@/components/buildflow/related-email-timeline";

type RequestDetails = {
  id: string;
  public_number: number;
  project_id: string;
  owner_id: string;
  title: string;
  status: QuoteRequestStatus;
  manager_assignee: string;
  manager_notes: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  projects: { name: string; address: string | null } | null;
};
type Attachment = {
  id: string;
  material_response_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
};
type RequestItem = {
  id: string;
  name: string;
  department: string;
  item_type: string;
  quantity: number;
  unit: string | null;
  answers: unknown;
  metadata: Record<string, unknown> | null;
};
type SupplierPackage = {
  id: string;
  department: string;
  supplier_id: string | null;
  status: string;
};
type LinkedSupplierQuote = {
  id: string;
  comparison_id: string | null;
  supplier_id: string | null;
  quote_number: string | null;
  quote_date: string | null;
  file_name: string;
  file_path: string;
};
type ComparisonRecord = Pick<
  QuoteComparisonRecord,
  | "id"
  | "request_id"
  | "title"
  | "status"
  | "client_quote_status"
  | "quote_number"
  | "awarded_bid_id"
  | "updated_at"
>;

function zipCodeFromAddress(address: string | null | undefined) {
  return address?.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || "11516";
}

export default async function OwnerMaterialRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const { supabase } = await requireStaffProfile("customers");
  const [
    { data: request, error: requestError },
    { data: responses },
    { data: attachments, error: attachmentsError },
    { data: items },
    { data: managerSettings },
    { data: packages },
    { data: clientActionEvents },
    { data: comparisons },
    { data: supplierRecommendations },
    { data: clientDocuments },
  ] = await Promise.all([
    supabase
      .from("quote_requests")
      .select(
        "id,public_number,project_id,owner_id,title,status,manager_assignee,manager_notes,created_at,updated_at,submitted_at,projects(name,address)",
      )
      .eq("id", requestId)
      .maybeSingle<RequestDetails>(),
    supabase
      .from("material_questionnaire_responses")
      .select(
        "id, request_id, project_id, owner_id, category_id, category_name_snapshot, category_slug_snapshot, definition_version, definition_snapshot, status, completed_at, created_at, updated_at",
      )
      .eq("request_id", requestId)
      .order("created_at")
      .returns<MaterialQuestionnaireResponse[]>(),
    supabase
      .from("quote_request_attachments")
      .select("id,material_response_id,file_name,file_path,file_type")
      .eq("request_id", requestId)
      .returns<Attachment[]>(),
    supabase
      .from("quote_request_items")
      .select("id,name,department,item_type,quantity,unit,answers,metadata")
      .eq("request_id", requestId)
      .order("created_at")
      .returns<RequestItem[]>(),
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{
        state: {
          qualificationSettings?: { suppliers?: SupplierRoutingOption[] };
        };
      }>(),
    supabase
      .from("supplier_packages")
      .select("id,department,supplier_id,status")
      .eq("request_id", requestId)
      .order("created_at")
      .returns<SupplierPackage[]>(),
    supabase
      .from("project_events")
      .select("id,title,description,metadata,created_at")
      .contains("metadata", { quote_request_id: requestId })
      .order("created_at", { ascending: false })
      .returns<
        Array<{
          id: string;
          title: string;
          description: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        }>
      >(),
    supabase
      .from("quote_comparisons")
      .select(
        "id,request_id,title,status,client_quote_status,quote_number,awarded_bid_id,updated_at",
      )
      .eq("request_id", requestId)
      .order("updated_at", { ascending: false })
      .returns<ComparisonRecord[]>(),
    supabase
      .from("quote_request_supplier_recommendations")
      .select("supplier_id,is_recommended,should_contact,contact_status,notes")
      .eq("request_id", requestId)
      .returns<Array<{ supplier_id: string; is_recommended: boolean; should_contact: boolean; contact_status: "not_contacted" | "request_sent" | "supplier_replied" | "awaiting_supplier_reply" | "quote_received"; notes: string }>>(),
    supabase
      .from("request_client_documents")
      .select("document_type,document_number,document_data,public_token,version,updated_at")
      .eq("request_id", requestId)
      .order("updated_at", { ascending: false })
      .returns<Array<{ document_type: "estimate" | "invoice" | "receipt"; document_number: string; document_data: RequestClientDocumentSnapshot["documentData"]; public_token: string; version: number; updated_at: string }>>(),
  ]);
  if (attachmentsError) console.error("Request attachments could not be loaded", { requestId, reason: attachmentsError.message });
  if (requestError)
    throw new Error(
      `Could not load this material request: ${requestError.message}`,
    );
  if (!request) notFound();
  const clientActions = (clientActionEvents ?? []).filter(
    (event) => typeof event.metadata?.client_action === "string",
  );
  const clientReplyCompleted = clientActions.some((event) =>
    ["email_reply", "estimate_sent", "invoice_sent", "receipt_sent"].includes(
      String(event.metadata.client_action),
    ),
  );
  const latestClientDocument = clientActions.find((event) =>
    ["invoice_sent", "receipt_sent"].includes(String(event.metadata.client_action)),
  );
  const paymentReceived = clientActions.some((event) => event.metadata.client_action === "payment_received") || ["quoted", "closed"].includes(request.status);
  const receiptDocument = (clientDocuments ?? []).find((document) => document.document_type === "receipt");
  const receiptSent = hasPersistedReceiptProof(
    clientActions.map((event) => event.metadata),
    receiptDocument ? { documentNumber: receiptDocument.document_number, publicToken: receiptDocument.public_token, version: receiptDocument.version } : null,
  );
  const clientApproved = clientActions.some((event) => event.metadata.client_action === "client_approved")
    || (comparisons ?? []).some((comparison) => comparison.client_quote_status === "accepted")
    || paymentReceived;
  const initialPaymentDelivery = {
    documentType: latestClientDocument?.metadata.client_action === "receipt_sent" ? "receipt" as const : latestClientDocument?.metadata.client_action === "invoice_sent" ? "invoice" as const : null,
    estimateSent: clientActions.some((event) => event.metadata.client_action === "estimate_sent"),
    clientApproved,
    invoiceSent: clientActions.some((event) => event.metadata.client_action === "invoice_sent"),
    receiptSent,
    paymentLinkSent: clientActions.some((event) => event.metadata.client_action === "payment_link_sent"),
    paymentReceived,
    deliveryScheduled: clientActions.some((event) => event.metadata.client_action === "delivery_scheduled"),
  };
  const workflowOverrides = new Map<number, boolean>();
  for (const event of clientActionEvents ?? []) {
    if (event.metadata?.manager_action !== "workflow_step_status") continue;
    const step = Number(event.metadata.workflow_step);
    if (
      workflowOverrides.has(step) ||
      typeof event.metadata.workflow_completed !== "boolean"
    )
      continue;
    workflowOverrides.set(step, event.metadata.workflow_completed);
  }

  const [{ data: profile }, answersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,email,phone")
      .eq("id", request.owner_id)
      .maybeSingle<{
        full_name: string | null;
        email: string | null;
        phone: string | null;
      }>(),
    responses?.length
      ? supabase
          .from("material_request_answers")
          .select(
            "id,response_id,question_id,question_key,question_label_snapshot,question_type_snapshot,answer_value,answer_display_snapshot,unit_snapshot",
          )
          .in(
            "response_id",
            responses.map((response) => response.id),
          )
          .order("created_at")
          .returns<MaterialRequestAnswer[]>()
      : Promise.resolve({ data: [] as MaterialRequestAnswer[] }),
  ]);
  const answers = answersResult.data ?? [];
  const clientEmail = contactEmailForDisplay(profile?.email);
  const comparisonIds = (comparisons ?? []).map((comparison) => comparison.id);
  const [comparisonItemsResult, comparisonBidsResult, supplierQuotesResult] = comparisonIds.length
    ? await Promise.all([
        supabase
          .from("quote_comparison_items")
          .select("*")
          .in("comparison_id", comparisonIds)
          .order("sort_order")
          .returns<QuoteComparisonItemRecord[]>(),
        supabase
          .from("quote_comparison_bids")
          .select("*,quote_comparison_prices(*)")
          .in("comparison_id", comparisonIds)
          .order("created_at")
          .returns<QuoteComparisonBidRecord[]>(),
        supabase
          .from("supplier_quotes")
          .select("id,comparison_id,supplier_id,quote_number,quote_date,file_name,file_path")
          .in("comparison_id", comparisonIds)
          .returns<LinkedSupplierQuote[]>(),
      ])
    : [
        { data: [] as QuoteComparisonItemRecord[] },
        { data: [] as QuoteComparisonBidRecord[] },
        { data: [] as LinkedSupplierQuote[] },
      ];
  const supplierQuoteSources = await Promise.all(
    (supplierQuotesResult.data ?? []).map(async (quote) => ({
      ...quote,
      sourceUrl: quote.file_path
        ? (await supabase.storage.from("supplier-quotes").createSignedUrl(quote.file_path, 1800)).data?.signedUrl ?? null
        : null,
    })),
  );
  const signedFiles = await Promise.all(
    (attachments ?? []).map(async (file) => {
      try {
        return {
          ...file,
          url: (await supabase.storage.from("project-uploads").createSignedUrl(file.file_path, 1800)).data?.signedUrl ?? null,
        };
      } catch (cause) {
        console.error("Request attachment URL could not be signed", { requestId, attachmentId: file.id, reason: cause instanceof Error ? cause.message : "unknown" });
        return { ...file, url: null };
      }
    }),
  );
  const suppliers = canonicalSupplierDirectory(
    managerSettings?.state?.qualificationSettings?.suppliers ?? [],
  );
  const organizedItems = (items ?? []).filter(
    (item) => item.metadata?.ai_organized === true,
  );
  const originalItems = (items ?? []).filter(
    (item) => item.metadata?.ai_organized !== true,
  );
  const organizationStatus =
    typeof originalItems[0]?.metadata?.ai_organization_status === "string"
      ? originalItems[0].metadata.ai_organization_status
      : "";
  const organizationCompletedAt =
    typeof originalItems[0]?.metadata?.ai_organization_completed_at === "string"
      ? originalItems[0].metadata.ai_organization_completed_at
      : "";
  const organizationCompletedLabel =
    organizationCompletedAt &&
    Number.isFinite(Date.parse(organizationCompletedAt))
      ? formatSiteDateTime(organizationCompletedAt, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  const departmentItems = organizedItems.length
    ? organizedItems
    : (items ?? []);
  const routeSelections = resolveRequestSupplierRouteSelections(items ?? [], suppliers);
  const departments = Array.from(
    new Set(
      departmentItems.map((item) =>
        normalizeMaterialCatalogDepartment(item.department),
      ),
    ),
  );
  if (!departments.length) departments.push("Others");
  const projectLabel =
    request.projects?.name === "Material Requests"
      ? request.projects.address
      : request.projects?.name;
  const currentStage = managerPipelineStage(
    request,
    comparisons ?? [],
    (packages ?? []).map((pkg) => ({ request_id: request.id, ...pkg })),
  );
  const comparisonSummaries: RequestComparisonSummary[] = (
    comparisons ?? []
  ).map((comparison) => {
    const comparisonItems = (comparisonItemsResult.data ?? []).filter(
      (item) => item.comparison_id === comparison.id,
    );
    const comparisonBids = (comparisonBidsResult.data ?? []).filter(
      (bid) => bid.comparison_id === comparison.id,
    );
    const comparisonDocuments = supplierQuoteSources.filter(
      (quote) => quote.comparison_id === comparison.id,
    );
    const analyses = analyzeQuoteComparison(comparisonItems, comparisonBids);
    return {
      id: comparison.id,
      title: comparison.title,
      status: comparison.status,
      awardedBidId: comparison.awarded_bid_id,
      clientQuoteStatus: comparison.client_quote_status,
      quoteNumber: comparison.quote_number,
      updatedAt: comparison.updated_at,
      bids: analyses.map((analysis) => ({
        id: analysis.bidId,
        supplierId: comparisonBids.find((bid) => bid.id === analysis.bidId)?.supplier_id || "",
        supplierName: analysis.supplierName,
        landedTotal: analysis.landedTotal,
        pricedItemCount: analysis.pricedItemCount,
        itemCount: analysis.itemCount,
        recommended: analysis.isRecommended,
      })),
      documents: comparisonDocuments.map((document) => ({
        id: document.id,
        supplierId: document.supplier_id,
        fileName: document.file_name,
        sourceUrl: document.sourceUrl,
      })),
    };
  });
  const supplierComparisonTables: RequestWorktableComparison[] = (
    comparisons ?? []
  ).map((comparison) => {
    const comparisonItems = (comparisonItemsResult.data ?? []).filter(
      (item) => item.comparison_id === comparison.id,
    );
    const comparisonBids = (comparisonBidsResult.data ?? []).filter(
      (bid) => bid.comparison_id === comparison.id,
    );
    const comparisonQuotes = supplierQuoteSources.filter(
      (quote) => quote.comparison_id === comparison.id,
    );
    const mapped = mapRequestSupplierComparison(comparisonItems, comparisonBids, {
      selectedBidId: comparison.awarded_bid_id,
      sources: comparisonBids.flatMap((bid) => {
        const quote = bid.source_supplier_quote_id
          ? comparisonQuotes.find(
              (candidate) => candidate.id === bid.source_supplier_quote_id,
            )
          : null;
        return quote ? [{
          bidId: bid.id,
          quoteDate: quote.quote_date,
          sourceLabel: quote.quote_number || quote.file_name,
          sourceUrl: quote.sourceUrl,
          checkedAt: quote.quote_date,
        }] : [];
      }),
    });
    return {
      id: comparison.id,
      title: comparison.title,
      href: `/admin/quote-comparison/${comparison.id}`,
      ...mapped,
    };
  });
  const { data: requestEmailLinks } = await supabase
    .from("aura_communication_links")
    .select("communication_id")
    .eq("entity_type", "material_request")
    .eq("entity_id", request.id);
  const linkedEmailIds = (requestEmailLinks ?? []).map(
    (link) => link.communication_id,
  );
  const { data: linkedEmails } = linkedEmailIds.length
    ? await supabase
        .from("aura_communications")
        .select(
          "id,direction,counterparty_email,subject,body,occurred_at,status",
        )
        .in("id", linkedEmailIds)
        .eq("channel", "email")
        .order("occurred_at", { ascending: false })
        .returns<RelatedEmailItem[]>()
    : { data: [] as RelatedEmailItem[] };
  const supplierEmailAddresses = new Set(
    suppliers
      .map((supplier) => supplier.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
  const normalizedClientEmail = clientEmail.trim().toLowerCase();
  const clientEmails = (linkedEmails ?? []).filter((email) => {
    const counterpart = email.counterparty_email?.trim().toLowerCase() || "";
    return (
      counterpart === normalizedClientEmail ||
      (!supplierEmailAddresses.has(counterpart) && email.direction !== "incoming")
    );
  });

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-3 pb-28 pt-4 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_5px_18px_rgba(15,23,42,.04)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">
                  {quoteRequestStatusLabel(request.status)}
                </p>
                <span className="text-xs text-slate-400">
                  Request #{request.public_number}
                </span>
              </div>
              <h1 className="mt-0.5 truncate text-xl font-bold sm:text-2xl">
                {request.title}
              </h1>
              {projectLabel ? (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {projectLabel}
                  {request.projects?.name !== "Material Requests" &&
                  request.projects?.address
                    ? ` · ${request.projects.address}`
                    : ""}
                </p>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-end gap-2 border-t border-slate-100 pt-3 text-sm lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <div className="min-w-28 flex-1 pb-1 lg:flex-none">
                <p className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">Client</p>
                <p className="font-bold text-slate-950">{profile?.full_name || "Client"}</p>
              </div>
              <RequestClientContact />
              <div className="w-44"><MaterialRequestAssigneeControl requestId={request.id} assignee={request.manager_assignee} compact /></div>
              <CustomerRequestStatus
                requestId={request.id}
                status={request.status}
                currentStage={currentStage}
              />
            </div>
          </div>
        </header>
        <RequestMaterialWorktable
          requestId={request.id}
          originalItems={originalItems}
          organizedItems={organizedItems}
          defaultZipCode={zipCodeFromAddress(request.projects?.address)}
          organizationStatus={organizationStatus}
          organizationCompletedLabel={organizationCompletedLabel}
          supplierComparisons={supplierComparisonTables}
          suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
          attachments={signedFiles.map((file) => ({ id: file.id, file_name: file.file_name, url: file.url }))}
        />
        {(responses ?? []).length ? (
          <details
            className="mt-2 rounded-lg border border-slate-200 bg-white"
          >
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold">Original answers · {answers.length}</summary>
            <div className="border-t border-slate-200 p-4">
              <p className="text-sm text-slate-500">The original items and AI copy are already together in the table above.</p>
              {(responses ?? []).map((response) => {
                const responseAnswers = answers.filter(
                  (answer) =>
                    answer.response_id === response.id &&
                    answer.answer_display_snapshot.trim(),
                );
                return (
                  <article
                    key={response.id}
                    className="mt-5 border-t border-slate-200 pt-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold">
                        {response.category_name_snapshot} details
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${response.status === "complete" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {response.status === "complete"
                          ? "Complete"
                          : "In progress"}
                      </span>
                    </div>
                    {responseAnswers.length ? (
                      <dl className="mt-4 grid gap-2">
                        {responseAnswers.map((answer) => (
                          <div
                            key={answer.question_key}
                            className="grid gap-1 rounded-lg bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(12rem,.8fr)_1.2fr]"
                          >
                            <dt className="text-sm font-semibold text-slate-700">
                              {answer.question_label_snapshot}
                            </dt>
                            <dd className="whitespace-pre-wrap text-sm font-semibold text-slate-950">
                              {answer.answer_display_snapshot}
                              {answer.unit_snapshot &&
                              !answer.answer_display_snapshot.includes(
                                answer.unit_snapshot,
                              )
                                ? ` ${answer.unit_snapshot}`
                                : ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-amber-700">
                        No material details were saved with this questionnaire.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </details>
        ) : null}
        <div className="mt-2">
          <RequestManagementPanel
            key={routeSelections.map((selection) => `${selection.supplierId || "manual"}:${selection.name}:${selection.note}`).sort().join("|")}
            requestId={request.id}
            requestTitle={request.title}
            client={{
              name: profile?.full_name || "Client",
              email: clientEmail,
              phone: profile?.phone || "",
            }}
            departments={departments}
            suppliers={suppliers}
            packages={packages ?? []}
            requestItems={departmentItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              reviewReasons: Array.isArray(item.metadata?.review_reasons)
                ? item.metadata.review_reasons.filter(
                    (reason): reason is string =>
                      typeof reason === "string" && Boolean(reason.trim()),
                  )
                : [],
            }))}
            pricingSummaryItems={departmentItems.map((item) => ({
              id: item.id,
              original: (() => {
                const sourceId = typeof item.metadata?.source_item_id === "string" ? item.metadata.source_item_id : item.id;
                return originalItems.find((source) => source.id === sourceId)?.name || item.name;
              })(),
              organized: item.name,
              route: Array.isArray(item.metadata?.supplier_route_names)
                ? item.metadata.supplier_route_names.filter((name): name is string => typeof name === "string").join(", ")
                : "",
              metadata: item.metadata ?? null,
            }))}
            routeSelections={routeSelections}
            projectAddress={request.projects?.address || ""}
            currentStage={currentStage}
            comparisons={comparisonSummaries}
            clientReplyCompleted={clientReplyCompleted}
            step2CompletedOverride={workflowOverrides.get(2) ?? null}
            step3CompletedOverride={workflowOverrides.get(3) ?? null}
            initialPaymentDelivery={initialPaymentDelivery}
            initialClientDocuments={(clientDocuments ?? []).map((entry) => ({ documentType: entry.document_type, documentNumber: entry.document_number, documentData: entry.document_data, publicToken: entry.public_token, version: entry.version, updatedAt: entry.updated_at }))}
            initialSupplierRecommendations={(supplierRecommendations ?? []).map((entry) => ({ supplierId: entry.supplier_id, isRecommended: entry.is_recommended, shouldContact: entry.should_contact, contactStatus: entry.contact_status, note: entry.notes || "" }))}
            clientEmails={clientEmails}
          />
        </div>
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Activity log
            </h2>
            {clientActionEvents?.length ? <div className="mt-3 divide-y divide-slate-100">
              {clientActionEvents.map((event) => (
                <article key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {event.title}
                    </h3>
                    <time className="text-xs text-slate-500">
                      {formatSiteDateTime(event.created_at, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  {event.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {event.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div> : <p className="mt-2 text-sm text-slate-500">No activity recorded yet.</p>}
          </section>
      </div>
    </main>
  );
}

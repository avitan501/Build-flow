import { notFound } from "next/navigation";

import { QuoteComparisonWorkspace } from "@/components/buildflow/quote-comparison-workspace";
import { requireStaffProfile } from "@/lib/auth";
import type { ClientQuoteAttachmentRecord, QuoteComparisonBidRecord, QuoteComparisonItemRecord, QuoteComparisonRecord } from "@/lib/quote-comparison";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools";
import { productChoiceFingerprint, restoreProductChoices, type ProductChoiceDraftColumns } from "@/lib/product-choice-draft";
import { loadProductMatchConfirmations } from "@/lib/product-match-server";
import { loadFinalizedProcurementRoute } from "@/lib/finalized-route-server";
import type { ReceivedSupplierQuoteLine } from "@/components/buildflow/received-supplier-quote-table";

type ProjectOption = { id: string; name: string; address: string | null };
type RequestClientQuoteSource = {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
};
type ClientOption = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone: string;
};

export default async function QuoteComparisonDetailPage({
  params,
}: {
  params: Promise<{ comparisonId: string }>;
}) {
  const { comparisonId } = await params;
  const { supabase, user } = await requireStaffProfile("suppliers");
  const [comparisonResult, itemsResult, bidsResult, projectsResult, directoryResult, clientsResult, attachmentsResult] = await Promise.all([
    supabase.from("quote_comparisons").select("*").eq("id", comparisonId).maybeSingle<QuoteComparisonRecord & ProductChoiceDraftColumns>(),
    supabase.from("quote_comparison_items").select("*").eq("comparison_id", comparisonId).order("sort_order").order("created_at").returns<QuoteComparisonItemRecord[]>(),
    supabase.from("quote_comparison_bids").select("*,quote_comparison_prices(*)").eq("comparison_id", comparisonId).order("created_at").returns<QuoteComparisonBidRecord[]>(),
    supabase.from("projects").select("id,name,address").order("updated_at", { ascending: false }).limit(150).returns<ProjectOption[]>(),
    supabase.rpc("staff_load_supplier_directory_snapshot"),
    supabase
      .from("profiles")
      .select("id,full_name,email,company_name,phone")
      .eq("role", "client")
      .eq("is_active", true)
      .not("email", "is", null)
      .order("full_name")
      .limit(500),
    supabase
      .from("quote_comparison_client_attachments")
      .select("id,comparison_id,file_name,file_path,file_type,file_size,created_at")
      .eq("comparison_id", comparisonId)
      .order("created_at")
      .returns<ClientQuoteAttachmentRecord[]>(),
  ]);

  if (comparisonResult.error || !comparisonResult.data) notFound();
  if (itemsResult.error || bidsResult.error || attachmentsResult.error) throw new Error("Could not load the quote comparison workspace.");
  bidsResult.data = await loadProductMatchConfirmations(supabase,bidsResult.data ?? []);
  const choiceFingerprint = await productChoiceFingerprint(itemsResult.data ?? [], bidsResult.data ?? []);
  const choiceState = restoreProductChoices(comparisonResult.data, choiceFingerprint);
  const finalized = await loadFinalizedProcurementRoute(supabase, comparisonId, comparisonResult.data.active_route_id);
  const receivedQuotes = await supabase.from("supplier_quotes")
    .select("id,supplier_name,file_name,supplier_quote_items(line_number,description,specification,quantity,unit,unit_price,line_total)")
    .eq("comparison_id", comparisonId).order("created_at")
    .returns<Array<{ id: string; supplier_name: string; file_name: string; supplier_quote_items: ReceivedSupplierQuoteLine[] }>>();
  if (receivedQuotes.error) throw new Error("Could not load received supplier quotes.");

  const requestClientQuoteSourcesResult = comparisonResult.data.request_id
    ? await supabase
        .from("quote_request_attachments")
        .select("id,request_id,file_name,file_path,file_type,file_size,created_at")
        .eq("request_id", comparisonResult.data.request_id)
        .eq("source_party", "client")
        .order("created_at", { ascending: false })
        .returns<RequestClientQuoteSource[]>()
    : { data: [] as RequestClientQuoteSource[], error: null };
  if (requestClientQuoteSourcesResult.error) throw new Error("Could not load client quote attachments for this request.");

  const snapshot = directoryResult.data as { settings?: { suppliers?: SupplierRoutingOption[] } } | null;
  const suppliers = snapshot?.settings?.suppliers ?? [];
  const departments = [...new Set(SHOP_TOOL_CATEGORIES.map((department) => department.label))];
  const clients: ClientOption[] = (clientsResult.data ?? [])
    .filter((client) => String(client.email || "").trim())
    .map((client) => ({
      id: client.id,
      name: String(client.full_name || client.email || "Client"),
      email: String(client.email),
      companyName: String(client.company_name || ""),
      phone: String(client.phone || ""),
    }));

  return (
    <QuoteComparisonWorkspace
      key={`${user.id}:${comparisonId}:${choiceFingerprint}:${comparisonResult.data.status}`}
      choiceActorId={user.id}
      initialProductSelections={choiceState.selections}
      productChoiceRevision={comparisonResult.data.product_choice_draft_revision ?? 0}
      productChoiceFingerprint={choiceFingerprint}
      productChoiceWarning={choiceState.warning}
      comparison={comparisonResult.data}
      procurementRoute={finalized.route}
      routeError={finalized.error}
      items={itemsResult.data ?? []}
      bids={bidsResult.data ?? []}
      receivedSupplierQuotes={(receivedQuotes.data ?? []).map(quote => ({ id: quote.id, supplierName: quote.supplier_name, fileName: quote.file_name, sourceItems: quote.supplier_quote_items ?? [], inComparison: (bidsResult.data ?? []).some(bid => bid.source_supplier_quote_id === quote.id) }))}
      suppliers={suppliers}
      projects={projectsResult.data ?? []}
      departments={departments}
      clients={clients}
      clientQuoteAttachments={attachmentsResult.data ?? []}
      requestClientQuoteSources={requestClientQuoteSourcesResult.data ?? []}
    />
  );
}

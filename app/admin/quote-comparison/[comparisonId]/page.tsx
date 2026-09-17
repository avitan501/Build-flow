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
import { currentRequestComparison } from "@/lib/current-request-comparison";
import type { ReviewableMaterialItem } from "@/lib/client-material-review";
import { matrixChoiceFingerprint,restoreMatrixChoices } from '@/lib/matrix-choice-draft';
import { quoteDuplicateKey } from '@/lib/comparison-quote-columns';
import { supplierProposalTotal } from '@/lib/supplier-proposal-total';

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
  let requestedMaterialLines:Record<string,string>={};
  let originalRequestLines:Record<string,string>={};
  let requestedComparisonItems:QuoteComparisonItemRecord[]|undefined;
  let missingRequestMaterials=0;
  if(comparisonResult.data.request_id && ['draft','review'].includes(comparisonResult.data.status) && !comparisonResult.data.active_route_id && !comparisonResult.data.awarded_bid_id && !['sent','accepted'].includes(comparisonResult.data.client_quote_status)){
    const sourceResult=await supabase.from('quote_request_items').select('id,name,quantity,unit,department,metadata,qualification_status').eq('request_id',comparisonResult.data.request_id).order('created_at').returns<ReviewableMaterialItem[]>();
    if(sourceResult.error)throw new Error('Could not load the saved request list.');
    const current=currentRequestComparison(sourceResult.data??[],itemsResult.data??[]);
    requestedComparisonItems=current.items;
    requestedMaterialLines=current.materialLines;
    originalRequestLines=current.originalLines;
    missingRequestMaterials=current.missingSourceIds.length;
  }
  bidsResult.data = await loadProductMatchConfirmations(supabase,bidsResult.data ?? []);
  const choiceFingerprint = await productChoiceFingerprint(itemsResult.data ?? [], bidsResult.data ?? []);
  const choiceState = restoreProductChoices(comparisonResult.data, choiceFingerprint);
  const finalized = await loadFinalizedProcurementRoute(supabase, comparisonId, comparisonResult.data.active_route_id);
  const receivedQuotes = await supabase.from("supplier_quotes")
    .select("id,supplier_name,quote_number,quote_date,file_name,file_size,mime_type,raw_text,supplier_quote_items(line_number,description,specification,quantity,unit,unit_price,line_total,comparison_item_id)")
    .eq("comparison_id", comparisonId).order("created_at")
    .returns<Array<{ id: string; supplier_name: string; quote_number:string;quote_date:string|null;file_name: string;file_size:number;mime_type:string;raw_text:string; supplier_quote_items: ReceivedSupplierQuoteLine[] }>>();
  if (receivedQuotes.error) throw new Error("Could not load received supplier quotes.");
  const sourceQuotes=(receivedQuotes.data??[]).map(q=>({id:q.id,supplierName:q.supplier_name,fileName:q.file_name,sourceItems:q.supplier_quote_items??[]}));
  const matrixFingerprint=await matrixChoiceFingerprint(requestedComparisonItems??itemsResult.data??[],sourceQuotes);
  const matrixState=restoreMatrixChoices(comparisonResult.data.product_choice_draft,matrixFingerprint);
  const duplicateKeys=await Promise.all((receivedQuotes.data??[]).map(quoteDuplicateKey));

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
      key={`${user.id}:${comparisonId}:${choiceFingerprint}:${matrixFingerprint}:${comparisonResult.data.status}`}
      choiceActorId={user.id}
      initialProductSelections={choiceState.selections}
      initialMatrixSelections={matrixState.selections}
      initialMatrixAcceptances={matrixState.acceptances}
      initialCalculationMode={matrixState.calculationMode}
      initialBaselineQuoteId={matrixState.baselineQuoteId}
      matrixSourceFingerprint={matrixFingerprint}
      productChoiceRevision={comparisonResult.data.product_choice_draft_revision ?? 0}
      productChoiceFingerprint={choiceFingerprint}
      productChoiceWarning={choiceState.warning||matrixState.warning}
      comparison={comparisonResult.data}
      procurementRoute={finalized.route}
      routeError={finalized.error}
      items={itemsResult.data ?? []}
      requestedMaterialLines={requestedMaterialLines}
      originalRequestLines={originalRequestLines}
      requestedComparisonItems={requestedComparisonItems}
      missingRequestMaterials={missingRequestMaterials}
      bids={bidsResult.data ?? []}
      receivedSupplierQuotes={(receivedQuotes.data ?? []).map((quote,index) => ({ id: quote.id, supplierName: quote.supplier_name, fileName: quote.file_name, duplicateKey:duplicateKeys[index],sourceItems: quote.supplier_quote_items ?? [], proposalTotal:supplierProposalTotal(quote.raw_text,quote.supplier_quote_items??[]), inComparison: (bidsResult.data ?? []).some(bid => bid.source_supplier_quote_id === quote.id) }))}
      suppliers={suppliers}
      projects={projectsResult.data ?? []}
      departments={departments}
      clients={clients}
      clientQuoteAttachments={attachmentsResult.data ?? []}
      requestClientQuoteSources={requestClientQuoteSourcesResult.data ?? []}
    />
  );
}

import { notFound } from "next/navigation";

import { QuoteComparisonWorkspace } from "@/components/buildflow/quote-comparison-workspace";
import { requireStaffProfile } from "@/lib/auth";
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord, QuoteComparisonRecord } from "@/lib/quote-comparison";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools";

type ProjectOption = { id: string; name: string; address: string | null };
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
  const { supabase } = await requireStaffProfile("suppliers");
  const [comparisonResult, itemsResult, bidsResult, projectsResult, directoryResult, clientsResult] = await Promise.all([
    supabase.from("quote_comparisons").select("*").eq("id", comparisonId).maybeSingle<QuoteComparisonRecord>(),
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
  ]);

  if (comparisonResult.error || !comparisonResult.data) notFound();
  if (itemsResult.error || bidsResult.error) throw new Error("Could not load the quote comparison workspace.");

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
      comparison={comparisonResult.data}
      items={itemsResult.data ?? []}
      bids={bidsResult.data ?? []}
      suppliers={suppliers}
      projects={projectsResult.data ?? []}
      departments={departments}
      clients={clients}
    />
  );
}

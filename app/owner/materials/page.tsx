import { OwnerMaterialsQuoteEditor } from "@/components/buildflow/owner-materials-quote-editor";
import { requireAdminProfile } from "@/lib/auth";
import { SHOP_ITEM_SELECT_FIELDS, buildShopDuplicateMatch, type ShopItemRecord, type ShopSupplierEstimateRecord } from "@/lib/shop";

function shopDuplicateKey(item: Pick<ShopItemRecord, "supplier_name" | "pricing_date" | "item_number" | "name" | "description" | "unit">) {
  const match = buildShopDuplicateMatch({
    supplierName: item.supplier_name,
    pricingDate: item.pricing_date,
    itemNumber: item.item_number,
    name: item.name,
    description: item.description,
    unit: item.unit,
  });

  if (match.itemNumber) {
    return `${item.supplier_name}|${item.pricing_date ?? ""}|${match.itemNumber}`;
  }

  return `${item.supplier_name}|${match.normalizedDescription ?? match.normalizedName ?? ""}|${(item.unit ?? "").trim().toUpperCase()}`;
}

export default async function OwnerMaterialsPage() {
  const { supabase } = await requireAdminProfile();
  const [{ data: estimates }, { data: items }] = await Promise.all([
    supabase
      .from("shop_supplier_estimates")
      .select("id, supplier_name, quote_number, estimate_date, source_file_name, source_file_path, status, created_by, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(24)
      .returns<ShopSupplierEstimateRecord[]>(),
    supabase
      .from("shop_items")
      .select(SHOP_ITEM_SELECT_FIELDS)
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<ShopItemRecord[]>(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-8 xl:px-8 2xl:px-10">
      <section className="mx-auto flex w-full max-w-[1700px] flex-col gap-5">
        <OwnerMaterialsQuoteEditor
          savedEstimates={estimates ?? []}
          publishedKeys={(items ?? []).map(shopDuplicateKey)}
        />
      </section>
    </main>
  );
}

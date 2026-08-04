import { notFound } from "next/navigation";

import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { buildShopProducts } from "@/lib/shop-catalog";
import { loadShopItems } from "@/lib/shop-loader";

export default async function PreviewAdminVendorsPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  const { data, error } = await loadShopItems({ limit: 240 });
  const products = buildShopProducts(data, error);

  return <SupplierRoutingManager catalogProducts={products} />;
}

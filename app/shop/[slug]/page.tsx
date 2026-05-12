import { notFound } from "next/navigation"

import { ShopProductDetailExperience } from "@/components/buildflow/shop-product-detail-experience"
import { buildShopProducts, findShopProductBySlug } from "@/lib/shop-catalog"
import type { ShopItemRecord } from "@/lib/shop"
import { createClient } from "@/lib/supabase/server"

function buildRelated(products: ReturnType<typeof buildShopProducts>, category: string, currentSlug: string) {
  return products.filter((product) => product.slug !== currentSlug && product.category === category).slice(0, 4)
}

export default async function ShopProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ buy?: string }> }) {
  const resolvedParams = await params
  const resolvedSearch = searchParams ? await searchParams : undefined
  const supabase = await createClient()
  const { data: itemsData, error } = await supabase
    .from("shop_items")
    .select("id, supplier_estimate_id, supplier_name, quote_number, pricing_date, item_number, name, description, category, quantity, unit, unit_price, extended_price, source, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<ShopItemRecord[]>()

  const products = buildShopProducts(itemsData, error)
  const product = findShopProductBySlug(products, resolvedParams.slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = buildRelated(products, product.category, product.slug)

  return <ShopProductDetailExperience product={product} relatedProducts={relatedProducts} buyMode={resolvedSearch?.buy === "1"} />
}

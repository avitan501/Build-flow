import { notFound } from "next/navigation"

import { ShopProductDetailExperience } from "@/components/buildflow/shop-product-detail-experience"
import { SAMPLE_SHOP_PRODUCTS, buildShopProducts, findShopProductBySlug } from "@/lib/shop-catalog"
import { loadShopItems } from "@/lib/shop-loader"

function buildRelated(products: ReturnType<typeof buildShopProducts>, productSlug: string, category: string, relatedCategories: string[]) {
  const sameCategory = products.filter((product) => product.slug !== productSlug && product.category === category)

  if (sameCategory.length >= 4) {
    return sameCategory.slice(0, 4)
  }

  const preferredCategories = products.filter(
    (product) =>
      product.slug !== productSlug &&
      product.category !== category &&
      relatedCategories.includes(product.category),
  )

  const fallbackPool = [...products, ...SAMPLE_SHOP_PRODUCTS].filter((product, index, array) => {
    if (product.slug === productSlug) return false
    return array.findIndex((candidate) => candidate.slug === product.slug) === index
  })

  return [...sameCategory, ...preferredCategories, ...fallbackPool].filter((product, index, array) => array.findIndex((candidate) => candidate.slug === product.slug) === index).slice(0, 8)
}

export default async function ShopProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ buy?: string }> }) {
  const resolvedParams = await params
  const resolvedSearch = searchParams ? await searchParams : undefined
  const { data: itemsData, error } = await loadShopItems({ limit: 120 })
  const products = buildShopProducts(itemsData, error)
  const product = findShopProductBySlug(products, resolvedParams.slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = buildRelated(products, product.slug, product.category, product.relatedCategories)

  return <ShopProductDetailExperience product={product} relatedProducts={relatedProducts} buyMode={resolvedSearch?.buy === "1"} />
}

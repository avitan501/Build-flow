"use client"

import { useEffect, useMemo, useState } from "react"

import {
  MANAGER_ADD_ONS_UPDATED_EVENT,
  departmentDisplayLabel,
  isManagerItemHidden,
  managerAddOnsToShopProducts,
  readManagerAddOns,
  resolveDepartmentSourceLabel,
  type ManagerCatalogAddOns,
} from "@/lib/manager-add-ons"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { ShopToolProductGrid } from "@/components/buildflow/shop-tool-product-grid"

type ShopToolCategoryProductsProps = {
  categoryLabel: string
  products: ShopCatalogProduct[]
}

function productKey(product: ShopCatalogProduct) {
  return `${product.name.trim().toLowerCase()}::${product.category.trim().toLowerCase()}`
}

export function ShopToolCategoryProducts({ categoryLabel, products }: ShopToolCategoryProductsProps) {
  const [managerAddOns, setManagerAddOns] = useState<ManagerCatalogAddOns>(() => readManagerAddOns())

  useEffect(() => {
    const syncManagerAddOns = () => {
      setManagerAddOns(readManagerAddOns())
    }

    syncManagerAddOns()
    window.addEventListener("storage", syncManagerAddOns)
    window.addEventListener(MANAGER_ADD_ONS_UPDATED_EVENT, syncManagerAddOns as EventListener)

    return () => {
      window.removeEventListener("storage", syncManagerAddOns)
      window.removeEventListener(MANAGER_ADD_ONS_UPDATED_EVENT, syncManagerAddOns as EventListener)
    }
  }, [])

  const mergedProducts = useMemo(() => {
    const sourceLabel = resolveDepartmentSourceLabel(managerAddOns, categoryLabel)
    const displayLabel = departmentDisplayLabel(managerAddOns, sourceLabel)
    const managerProducts = managerAddOnsToShopProducts(managerAddOns).filter((product) => {
      const productSourceLabel = resolveDepartmentSourceLabel(managerAddOns, product.category)
      return product.category === sourceLabel || product.category === displayLabel || productSourceLabel === sourceLabel
    })

    return [...managerProducts, ...products].filter((product, index, all) => {
      const key = productKey(product)
      return (
        !isManagerItemHidden(managerAddOns, product.id) &&
        all.findIndex((candidate) => candidate.id === product.id || candidate.slug === product.slug) === index &&
        all.findIndex((candidate) => productKey(candidate) === key) === index
      )
    })
  }, [categoryLabel, managerAddOns, products])

  if (mergedProducts.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-[0_14px_34px_rgba(148,163,184,0.08)]">
        No items are assigned to this tool page yet.
      </section>
    )
  }

  return <ShopToolProductGrid products={mergedProducts} questionnaireDepartment={categoryLabel} />
}

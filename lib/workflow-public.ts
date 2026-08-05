import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons"
import type { ProductQualificationSetting, ShopQualificationSettings } from "@/lib/shop-qualification"

export type PublicWorkflowState = {
  qualificationSettings?: {
    products: Record<string, ProductQualificationSetting>
  }
  addOns?: ManagerCatalogAddOns
}

export function publicWorkflowState(input: {
  qualificationSettings: ShopQualificationSettings
  addOns: ManagerCatalogAddOns
}): PublicWorkflowState {
  return {
    qualificationSettings: {
      products: Object.fromEntries(
        Object.entries(input.qualificationSettings.products).map(([productId, setting]) => [
          productId,
          { ...setting, supplierId: "" },
        ]),
      ),
    },
    addOns: {
      ...input.addOns,
      products: input.addOns.products.map((product) => ({
        ...product,
        supplierId: "",
        supplierName: "Avantia Build",
      })),
      services: input.addOns.services.map((service) => ({
        ...service,
        supplierId: "",
        supplierName: "Avantia Build",
      })),
    },
  }
}

import type { ShopQualificationSettings, SupplierRoutingOption } from "@/lib/shop-qualification"

export type SupplierDirectorySnapshot = {
  settings: ShopQualificationSettings
  deletedSupplierIds: string[]
}

export function parseSupplierDirectorySnapshot(value: unknown): SupplierDirectorySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const snapshot = value as Partial<SupplierDirectorySnapshot>
  if (!snapshot.settings || !Array.isArray(snapshot.settings.suppliers) || !snapshot.settings.products) return null
  return {
    settings: snapshot.settings,
    deletedSupplierIds: Array.isArray(snapshot.deletedSupplierIds)
      ? snapshot.deletedSupplierIds.filter((id): id is string => typeof id === "string")
      : [],
  }
}

export function confirmSupplierDirectoryPersistence(
  value: unknown,
  expected: Pick<SupplierRoutingOption, "id" | "name">,
) {
  const snapshot = parseSupplierDirectorySnapshot(value)
  if (!snapshot) return null
  const expectedId = String(expected.id || "").trim()
  const expectedName = String(expected.name || "").trim()
  if (!expectedId || !expectedName) return null
  return snapshot.settings.suppliers.find((supplier) => supplier.id === expectedId && supplier.name === expectedName) ?? null
}

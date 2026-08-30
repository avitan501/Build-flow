import type { MaterialCatalogItem } from "@/lib/material-catalog"

export function catalogRetailerSearchLinks(item: MaterialCatalogItem) {
  const query = encodeURIComponent([item.name, item.brand, item.measurement, item.thickness].filter(Boolean).join(" "))
  return [
    { name: "Home Depot", url: `https://www.homedepot.com/s/${query}` },
    { name: "Lowe's", url: `https://www.lowes.com/search?searchTerm=${query}` },
  ]
}

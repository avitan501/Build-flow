import { permanentRedirect } from "next/navigation"

import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("services", "Construction Services")

export default function ServicesPage() {
  permanentRedirect("/shop?category=Services")
}

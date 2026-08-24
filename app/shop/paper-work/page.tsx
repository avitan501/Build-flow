import { permanentRedirect } from "next/navigation"

import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata("paper-work", "Paperwork")

export default function PaperWorkPage() {
  permanentRedirect("/shop?category=Services")
}

import type { Metadata } from "next"

import { ShareAdsCenter } from "@/components/buildflow/share-ads-center"
import { requireOwnerAccess } from "@/lib/owner-access"

export const metadata: Metadata = {
  title: "Share Ads | Avantia Build",
  description: "Owner-only approved flyer and message sharing center.",
}

export default async function ShareAdsPage() {
  await requireOwnerAccess("/admin/share-ads")
  return <ShareAdsCenter />
}

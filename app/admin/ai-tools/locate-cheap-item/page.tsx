import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LocateCheapItemPreview } from "@/components/buildflow/locate-cheap-item-preview";
import { requireManagerPortalProfile } from "@/lib/auth";
import { locateCheapItemEnabled } from "@/lib/locate-cheap-item/feature";

export const metadata: Metadata = {
  title: "Locate Cheap Item | Avantia Build Manager",
  description: "Review sourced construction products, prices, and supplier contacts.",
};

export default async function LocateCheapItemPage() {
  const { access } = await requireManagerPortalProfile();
  if (!access.aiTools) redirect("/");

  return <LocateCheapItemPreview enabled={locateCheapItemEnabled()} />;
}

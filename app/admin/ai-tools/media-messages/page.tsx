import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { MediaMessagesLibrary } from "@/components/buildflow/media-messages-library"
import { requireManagerPortalProfile } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Media & Messages | Avantia Build Manager",
  description: "Review approved Avantia media, exact messages, and safe communication drafts.",
}
export default async function MediaMessagesPage() {
  const { access } = await requireManagerPortalProfile()
  if (!access.aiTools) redirect("/")
  return <MediaMessagesLibrary />
}

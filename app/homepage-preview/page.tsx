import type { Metadata } from "next"

import { HomepageConceptPreview } from "@/components/buildflow/homepage-concept-preview"

export const metadata: Metadata = {
  title: "Avantia Homepage Concepts",
  description: "Private review of five short Avantia Build homepage concepts.",
  robots: { index: false, follow: false },
}

export default function HomepagePreviewPage() {
  return <HomepageConceptPreview />
}

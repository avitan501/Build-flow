import { ConciergeVideoLibrary } from "@/components/buildflow/concierge-video-library";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "How Avantia Construction Concierge Works",
  description: "Seven short videos show how Avantia handles takeoffs, supplier comparison, ordering, and jobsite delivery coordination.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return <ConciergeVideoLibrary />;
}

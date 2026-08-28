import { ConciergeVideoLibrary } from "@/components/buildflow/concierge-video-library";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Learn About Avantia Build | Your Construction Materials Concierge",
  description: "See how Avantia Build helps contractors, designers, clients, and suppliers organize construction-material requests, pricing, orders, and jobsite deliveries.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return <ConciergeVideoLibrary />;
}

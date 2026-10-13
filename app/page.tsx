import { HomepageConceptPreview } from "@/components/buildflow/homepage-concept-preview";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Avantia Build | Your Construction Concierge",
  description: "Tired of chasing suppliers and handling material shortages? Book a free consultation with Avantia and build a plan around the help you need.",
  path: "/",
  openGraphTitle: "Avantia Build | Your Construction Concierge",
});

export default function Home() {
  return <HomepageConceptPreview initialConceptId={2} reviewOnly />;
}

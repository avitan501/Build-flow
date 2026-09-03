import { HomepageConceptPreview } from "@/components/buildflow/homepage-concept-preview";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Avantia Build | Construction Materials, Handled.",
  description: "Send plans or a material list. Avantia compares suppliers, organizes the order, and coordinates jobsite delivery.",
  path: "/",
  openGraphTitle: "Avantia Build | Your Construction Materials Desk",
});

export default function Home() {
  return <HomepageConceptPreview initialConceptId={2} reviewOnly />;
}

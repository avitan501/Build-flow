import { RenovationEstimator } from "@/components/buildflow/renovation-estimator";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Apartment Renovation Estimator | Avantia Build",
  description: "Build a material-only apartment renovation budget by unit, finish class, scope, and state.",
  path: "/ai/renovation-estimator",
});

export default function RenovationEstimatorPage() {
  return <RenovationEstimator />;
}

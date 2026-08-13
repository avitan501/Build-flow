import type { Metadata } from "next";

import { RenovationEstimator } from "@/components/buildflow/renovation-estimator";

export const metadata: Metadata = {
  title: "Apartment Renovation Estimator | Avantia Build",
  description: "Build a material-only apartment renovation budget by unit, finish class, scope, and state.",
};

export default function RenovationEstimatorPage() {
  return <RenovationEstimator />;
}

import type { Metadata } from "next"

import { DeliveryEstimator } from "@/components/buildflow/delivery-estimator"

export const metadata: Metadata = {
  title: "Fast Jobsite Delivery | BuildFlow",
  description: "Estimate and request an emergency material delivery to your jobsite.",
}

export default function DeliveryPage() {
  return <DeliveryEstimator />
}

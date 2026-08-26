import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DeliveryEstimator } from "@/components/buildflow/delivery-estimator";
import { DeliveryRequestQueue } from "@/components/buildflow/delivery-request-queue";
import { requireManagerPortalProfile } from "@/lib/auth";
import { loadDeliveryRequests } from "@/lib/delivery-requests";

export const metadata: Metadata = {
  title: "Jobsite Delivery | Avantia Build Manager",
  description: "Plan, price, and manage material deliveries to jobsites.",
};

export default async function ManagerJobsiteDeliveryPage() {
  const { access, profile, supabase, user } = await requireManagerPortalProfile();
  if (!access.aiTools) redirect("/");

  const requests = await loadDeliveryRequests(supabase);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fc_0%,#eaf1fa_48%,#f8fafc_100%)]">
      <DeliveryEstimator
        defaultContactName={profile?.full_name || ""}
        defaultContactPhone={profile?.phone || user.phone || ""}
        deliveryHistory={requests.map((request) => ({
          storeName: request.storeName,
          pickupAddress: request.pickupAddress,
          pickupCoordinates: request.pickupCoordinates,
          jobsiteName: request.jobsiteName,
          jobsiteAddress: request.jobsiteAddress,
          jobsiteCoordinates: request.jobsiteCoordinates,
        }))}
      />
      <DeliveryRequestQueue requests={requests} />
    </main>
  );
}

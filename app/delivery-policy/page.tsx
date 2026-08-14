import { PolicyPage } from "@/components/buildflow/policy-page"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({ title: "Delivery Policy | Avantia Build", description: "Jobsite delivery expectations for Avantia Build material orders.", path: "/delivery-policy" })

export default function DeliveryPolicyPage() {
  return <PolicyPage eyebrow="Jobsite coordination" title="Delivery Policy" updated="August 14, 2026" introduction="Avantia coordinates delivery windows with suppliers and carriers. The confirmed quote or order controls the specific delivery method, charge, and timing." sections={[
    { title: "Scheduling", paragraphs: ["Delivery dates and windows depend on stock, supplier schedules, traffic, weather, and jobsite conditions. A requested date is not guaranteed until Avantia confirms it."] },
    { title: "Site access", paragraphs: ["Customers must provide a safe legal unloading area, accurate access instructions, contact availability, and any required permits, parking arrangements, gate access, elevator reservations, or building approvals."] },
    { title: "Delivery location", paragraphs: ["Standard delivery may be curbside or to the nearest safely accessible location. Carry-in, floor placement, crane service, boom service, or special handling must be confirmed separately."] },
    { title: "Inspection", paragraphs: ["Count and inspect materials promptly. Record shortages, visible damage, or incorrect items on the delivery ticket when possible and contact Avantia with photos immediately."] },
    { title: "Failed delivery", paragraphs: ["Additional charges may apply when delivery cannot be completed because access, receiving personnel, permits, site readiness, or customer information was missing or inaccurate."] },
  ]} />
}

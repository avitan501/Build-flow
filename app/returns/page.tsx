import { PolicyPage } from "@/components/buildflow/policy-page"
import { RESTOCKING_TERM } from "@/lib/proposal-terms"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({ title: "Returns and Damaged Materials | Avantia Build", description: "Return eligibility and damaged-material reporting for Avantia Build orders.", path: "/returns" })

export default function ReturnsPage() {
  return <PolicyPage eyebrow="After delivery" title="Returns and Damaged Materials" updated="September 3, 2026" introduction="Return eligibility depends on the supplying store or manufacturer and the written terms confirmed before purchase." sections={[
    { title: "Before ordering", paragraphs: ["Confirm quantities, sizes, colors, finishes, model numbers, and delivery conditions before approval. Custom, cut, mixed, tinted, opened, clearance, and special-order materials may be final sale."] },
    { title: "Requesting a return", paragraphs: ["Contact Avantia promptly with the order reference, item, quantity, reason, and clear photos. Keep materials clean, unused, complete, and in original packaging while eligibility is reviewed."] },
    { title: "Damaged or incorrect materials", paragraphs: ["Inspect materials at delivery when possible. Photograph damage, labels, packaging, and the delivery ticket immediately and note visible damage with the driver before signing when permitted."] },
    { title: "Fees and transportation", paragraphs: [RESTOCKING_TERM, "Nothing in this policy limits rights for defective or materially nonconforming goods, or any other right protected by applicable law."] },
    { title: "Refund timing", paragraphs: ["Eligible refunds are processed after the supplier accepts and credits the returned material. Timing depends on supplier inspection and the original payment method."] },
  ]} />
}

import { PolicyPage } from "@/components/buildflow/policy-page"
import { pageMetadata } from "@/lib/site-metadata"
import { CREDIT_CARD_PROCESSING_TERM } from "@/lib/proposal-terms"

export const metadata = pageMetadata({ title: "Terms of Use | Avantia Build", description: "Terms for using the Avantia Build website and material coordination service.", path: "/terms" })

export default function TermsPage() {
  return <PolicyPage eyebrow="Website and requests" title="Terms of Use" updated="August 26, 2026" introduction="These terms apply to use of the Avantia Build website. A written quote, order confirmation, supplier term, or signed agreement may include additional terms for a specific transaction." sections={[
    { title: "Material requests", paragraphs: ["Website calculations, plan extraction, product information, and preliminary pricing are estimates for review. Customers are responsible for confirming measurements, quantities, specifications, code requirements, access, and delivery details before approving an order."] },
    { title: "Pricing and availability", paragraphs: ["Prices, taxes, freight, lead times, and availability may change until Avantia confirms the order in writing. Avantia will not substitute a material without customer approval unless the written order expressly allows it."] },
    { title: "Payment terms", paragraphs: [CREDIT_CARD_PROCESSING_TERM] },
    { title: "Customer responsibilities", paragraphs: ["Customers must provide accurate contact, project, payment, access, and delivery information and must have permission to upload or share submitted plans and documents."] },
    { title: "Acceptable use", paragraphs: ["Do not misuse the website, interfere with its operation, upload harmful or unlawful content, attempt unauthorized access, or use another person’s information without permission."] },
    { title: "Limitations", paragraphs: ["To the extent allowed by law, Avantia is not responsible for indirect losses caused by inaccurate customer information, supplier delays, site conditions, or events outside reasonable control. These terms do not limit rights that cannot legally be waived."] },
  ]} />
}

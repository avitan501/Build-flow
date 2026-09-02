import { PolicyPage } from "@/components/buildflow/policy-page"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "How We Select Materials | Avantia Build",
  description: "How Avantia Build prepares product guides, compares construction materials, and verifies supplier and retailer links.",
  path: "/how-we-select-materials",
})

export default function HowWeSelectMaterialsPage() {
  return (
    <PolicyPage
      eyebrow="Our selection process"
      title="How We Select Materials"
      updated="September 2, 2026"
      introduction="Avantia Build helps contractors, builders, property owners, and project teams organize material requests, compare options, and reach suppliers. Our guides support purchasing decisions; they do not replace project drawings, manufacturer instructions, code review, or professional advice."
      sections={[
        {
          title: "What we review",
          paragraphs: [
            "We start with the customer's requested item, size, thickness, model, quantity, selling unit, quality requirements, delivery ZIP code, and timing. We may compare manufacturer information, supplier quotes, public retailer pages, and dated catalog records.",
            "An item is treated as an exact match only when the important specifications agree. Alternatives, uncertain matches, and missing details should be identified for review rather than presented as the same product.",
          ],
        },
        {
          title: "How comparisons work",
          paragraphs: [
            "We compare equivalent units and package quantities so a piece, box, sheet, roll, or pallet is not mistaken for another selling unit. Product price, tax, delivery, availability, and lead time may be shown separately because the lowest shelf price is not always the lowest delivered cost.",
            "Online prices are snapshots. A source date, merchant, model or item number, and direct page should be checked before a purchase or customer quote is finalized.",
          ],
        },
        {
          title: "Supplier and retailer links",
          paragraphs: [
            "Links may open a manufacturer, supplier, or retailer page so the user can verify information or complete a purchase. The link label identifies the destination and does not imply an official relationship with that business.",
            "When a link may earn a commission, we place a plain-language affiliate disclosure with the link. Compensation does not determine factual claims, product specifications, match confidence, or whether an item is suitable for a project.",
          ],
        },
        {
          title: "Customer verification",
          paragraphs: [
            "Before ordering, confirm field measurements, quantities, compatibility, code requirements, manufacturer instructions, current stock, delivery access, and the retailer's final terms. Ask Avantia Build to review any unclear item before purchasing.",
          ],
        },
      ]}
    />
  )
}

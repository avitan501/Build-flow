import { PolicyPage } from "@/components/buildflow/policy-page"
import { AFFILIATE_DISCLOSURE } from "@/lib/affiliate-policy"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Affiliate Disclosure | Avantia Build",
  description: "How Avantia Build identifies affiliate links and keeps material guidance independent from compensation.",
  path: "/affiliate-disclosure",
})

export default function AffiliateDisclosurePage() {
  return (
    <PolicyPage
      eyebrow="Retailer transparency"
      title="Affiliate Disclosure"
      updated="September 2, 2026"
      introduction={`${AFFILIATE_DISCLOSURE} We place a clear disclosure beside or immediately above links that may earn a commission.`}
      sections={[
        {
          title: "How affiliate links work",
          paragraphs: [
            "A retailer may pay Avantia Build a commission after a qualifying purchase made through an eligible link. The retailer processes the purchase and determines the final price, availability, taxes, delivery, returns, and warranty terms.",
            "Not every outbound link earns a commission. Some links are ordinary research shortcuts provided to help customers verify a product or contact a supplier.",
          ],
        },
        {
          title: "How we select materials",
          paragraphs: [
            "Compensation does not determine our factual product claims, specifications, or whether an item matches a customer request. We compare the requested size, model, quantity, unit, availability, delivery details, and dated source information before presenting a match.",
            "Prices and inventory can change by time, store, account, and delivery ZIP code. Confirm the exact item and final terms on the retailer's website before ordering.",
          ],
        },
        {
          title: "Retailer independence",
          paragraphs: [
            "Retailer names identify where a link leads. Unless a page explicitly states otherwise, they do not mean that Avantia Build is approved, endorsed, sponsored, or an official representative of that retailer.",
            "Retailer names and trademarks belong to their respective owners. Avantia Build does not use a retailer logo or tracking link unless the applicable program permits that use.",
          ],
        },
        {
          title: "Questions or corrections",
          paragraphs: [
            "If a merchant name, product description, price, or link appears inaccurate, contact us. We will review the source and correct confirmed errors.",
          ],
        },
      ]}
    />
  )
}

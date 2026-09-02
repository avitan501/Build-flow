import Link from "next/link"

import { AFFILIATE_DISCLOSURE } from "@/lib/affiliate-policy"

export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p
      data-testid="affiliate-disclosure"
      className={`rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-950 ${className}`.trim()}
    >
      <strong>Affiliate disclosure:</strong> {AFFILIATE_DISCLOSURE}{" "}
      <Link href="/affiliate-disclosure" className="font-bold text-[#0066cc] underline underline-offset-2">
        Learn more
      </Link>
    </p>
  )
}

# Supplier comparison research and implementation

User scope: research established procurement practices, improve automation and
publish while preserving the existing design. No paid provider installation,
business upload, outreach, purchasing or substitution approval.

Research: 45 search results requested across 9 searches/3 territories,
7 official documentation pages subsequently fetched. Search results are
discovery, not 45 independently validated sources. Vendor manuals establish
documented behavior, not independently measured accuracy.

## Findings and decision

- Procore separates original submitted prices from private leveling adjustments,
  tracks notes/activity and makes alternate inclusion explicit:
  https://v2.support.procore.com/product-manuals/bidding-project/tutorials/level-bids-for-a-bid-form
- Autodesk BuildingConnected uses internal plugs for comparison, not edits to
  supplier submissions:
  https://support.buildingconnected.com/hc/en-us/articles/360026547553-How-to-make-adjustments-to-bids-in-Bid-Leveling
- Kojo distinguishes PDF scan review from item mapping, supports no-quote,
  replacements, pricing UOM and backorders:
  https://support.usekojo.com/hc/en-us/articles/38654174541075-How-to-Submit-Quotes-Using-the-New-Bid-Portal-to-Kojo-Contractors
- Oracle supports line-level quantity allocation across suppliers:
  https://docs.oracle.com/en/cloud/saas/procurement/26a/oaprc/example-of-awarding-a-negotiation-by-splitting-negotiation-lines.html
- Coupa keeps request-line identity separate from supplier part number/name and
  attaches source documents at line level:
  https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/resources/transactional-resources/sourcing-api-quote_requests/quote-response-lines-api
- Microsoft and AWS recommend human review appropriate to uncertainty/use case;
  confidence is not a guarantee of correct business equivalence:
  https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/accuracy-confidence?view=doc-intel-4.0.0
  https://docs.aws.amazon.com/textract/latest/dg/textract-best-practices.html

Adopt bid-leveling principles in the existing design: source evidence remains,
normalization is conservative, uncertain matching stays reviewed. First improve
existing PDF text-layer support rather than subscribing to OCR without a measured
benchmark on representative customer documents. External OCR remains a future
evaluated fallback, not installed or claimed active.

## Candidate implementation

Base 833c2c476b551b3a2488697ae5374364deaff916; isolated branch
codex/quote-leveling-20260915 at /tmp/avantia-quote-leveling-20260915.

- Reconstruct horizontal PDF rows from coordinates, capped at100 pages;
  optional failure retains original text/visual AI route. Choose reconstructed
  text only for supported column headers with a reconciled full subtotal.
- Read explicitly labeled dual Sale/Un and Sale/Ft tables, preserving printed
  unit amount, line total, section, length and row number. Ignore zero-quantity
  section headings. No automatic pack interpretation.
- Prefer reconciled supported source rows over an incomplete AI rewrite.
- Expand complete printed LF cut lists into piece comparison rows only if
  both total footage and exact summed cents reconcile. Source rate/quantity/total
  retained per derived row and original PDF/text remain. No inferred lengths or
  unexplained charge allocation. Expansion is not product-equivalence approval.
- Retain existing product/price review gates; add face/top mount qualifiers.
- No component/style edits, DB migrations or Edge Function changes.

Actual two-PDF extraction with injected incomplete AI output produced BFS
39 comparison rows/$51,742.11 from29 printed rows and Certified39 rows/$60,615.46.
This was local processing, not a live provider call or user upload verification.
BFS tax amount is not a source tax-percent label; existing AI supplies that field.
The39 derived rows do not assert all39 requested products are equivalent.

Tests: 58 targeted extraction/safety/regression tests pass across desktop/WebKit
projects; 23 bounded release tests pass against the local production build.
Production webpack build, TypeScript and targeted ESLint pass. The first release
test attempt had 7 connection-refused failures because the local server was not
running; all 23 passed after starting the candidate server. Publication pending.
Actual business upload/mapping/persistence awaits user upload; no duplicate made.
No zero-error/100% accuracy claim. Scanned PDFs/new layouts still require review.

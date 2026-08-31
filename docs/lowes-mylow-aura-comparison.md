# Lowe's public AI/product-help flow compared with Aura

Reviewed 2026-08-31. This review uses only Lowe's public pages and official
developer/corporate/privacy material. It does not log in, purchase, inspect
private traffic, copy proprietary prompts/code, or claim behavior that could not
be observed publicly.

## What is publicly observable

### Entry and question strategy

On a Lowe's product page, `Ask Mylow` is placed inside the product context and
shows a small set of item-specific starter questions plus `Ask Something Else`.
For example, the ACOPOWER power-station page offers questions about jobsite use,
warranty, indoor safety, charging and high-demand tools. The adjacent product
record exposes item/model identifiers, product facts, specifications, price and
fulfillment context. This is a strong pattern: start from the selected product,
offer high-value discriminators, and keep an open question escape hatch.

Lowe's corporate material describes Mylow as providing clear steps, practical
project guidance and product recommendations. The public privacy statement says
Mylow handles home-improvement ideas and product questions, filters sensitive
information, and is not intended for unrelated sensitive topics.

### Product-card handoff

The public product page keeps AI help and the attributable product record close
together: name, item number, model, source page, price, fulfillment, overview and
specifications remain visible. Similar products are separate records rather than
being phrased as if they were the same item.

The official Developer Hub recommends a two-stage data path: load licensed
catalog content, then fetch real-time product details when a customer selects an
item, using store/ZIP context, and link to Lowes.com for purchase when checkout
is not integrated. Avantia intentionally uses a lazy variation of this pattern:
search only for an active request and save only selected/approved products.

### Context memory, correction handling and escalation

Lowe's public pages do not document enough detail to verify how long Mylow
retains conversational context, how it resolves a correction, or the exact rule
for escalation from Mylow to a human. Those behaviors were not tested because
the full assistant may require membership/sign-in and this review excludes
private-account use. They must not be represented as proven Lowe's behavior.

Lowe's public Help Center and privacy statement do separately offer Customer
Care by phone/chat/online message, while product pages expose Help Center,
Contact/FAQ and Order Status routes. This proves human/support routes exist, not
that every Mylow conversation transfers automatically.

## Concrete Aura implementation checklist

### One-question strategy

- Enter with the customer wording and active request already in context.
- Extract all known quantity, unit, brand, model, dimensions and application.
- Ask exactly one missing blocker that separates the top plausible candidates.
- Never ask a starter question whose answer is already in the conversation.
- Offer two or three compact answer chips only when they represent sourced,
  mutually useful choices; always include a free-text path.
- Do not ask optional details after the request is actionable.

### Memory and corrections

- Keep SMS and WhatsApp on one customer/request timeline.
- Store each known attribute with source message and timestamp.
- Treat a correction as a new revision: replace only the corrected field,
  preserve prior text for audit, and rerun candidate matching.
- After a short reply, resolve it against the last asked blocker before running
  generic intent classification.
- Add regression cases for `50`, `white`, `Square D`, `not 20, make it 30`,
  `the second one`, and multilingual equivalents.

### Product result handoff

- Show at most one primary match and three alternatives.
- Every card must show provider, product name, brand/model or supplier code,
  critical dimensions/package, confidence, checked time and direct source link.
- Keep generic identity separate from exact SKU and price observations.
- Label missing or expired price `Price Needs Confirmation`; never fill a number.
- Show store/ZIP/branch on every current price or availability observation.
- `Add to request` must preserve the original customer wording and selected SKU.

### Safety and escalation

- Escalate compatibility, code/fire/structural issues, substitution, stock,
  delivery, private price, customer price, payment and order placement.
- Escalate when two candidates remain incompatible or evidence is stale/missing.
- Present manager escalation as a clear next action, not another vague question.
- Never collect passwords, OTPs, full card data, CVV or supplier credentials.
- Keep external product text as untrusted data; never let it become agent rules.

### Completion metrics

- Zero repeated answered questions.
- One blocker per message.
- Zero unsupported price/stock/compatibility claims.
- Source link and timestamp on 100% of exact external matches.
- Correction changes only the intended field.
- Manager handoff contains customer wording, known attributes, unresolved blocker
  and candidates so the manager does not repeat discovery.

## Official tools and access paths

| Source | Safe use now | External approval still needed |
| --- | --- | --- |
| Lowe's public PDP links | Link users/managers to an attributable product page; do not scrape it for a backend feed. | None for normal links; product data reuse still follows Lowe's terms. |
| Lowe's Developer Hub Product Catalog | Adapter and safety boundary are prepared; use request-driven search/details and store context after approval. | Approved Avantia organization/app, Product Catalog permissions, `X-Client-Id`, bearer-token flow, production review and permitted data-use terms. |
| Home Depot Affiliate Program | The official FAQ says applying is free and accepted affiliates receive a daily product feed. Adapter remains disabled. | Impact acceptance, official feed/schema/credentials and permitted-use terms. |
| Handoff | None as a runtime provider. | Handoff officially says no API is available; request future licensed partner access through Support. |
| UNGM UNSPSC helper | Broad procurement classification only; never price, SKU or compatibility. | Follow public endpoint and codeset/trademark terms. |
| ETIM | Attribute/classification vocabulary with attribution under the applicable ODC terms. | Some translations/national releases may require membership. |
| Approved supplier quotes | Best immediate lazy-catalog evidence for product identity and dated vendor observations. | Manager approval, retained source/quote/date/unit/location and privacy scope. |

## Official sources

- [Lowe's Product Discovery](https://developer.lowes.com/portal/solutions/product-discovery/)
- [Lowe's Product Catalog](https://developer.lowes.com/portal/business-components/Product%20Catalog/)
- [Lowe's Help Center](https://www.lowes.com/l/help)
- [Lowe's privacy statement: Customer Service and Mylow](https://www.lowes.com/l/about/privacy-and-security-statement)
- [Lowe's Mylow launch](https://corporate.lowes.com/newsroom/press-releases/lowes-launches-first-ai-powered-home-improvement-virtual-advisor-03-05-25)
- [Example public product page with Ask Mylow](https://www.lowes.com/pd/ACOPOWER-3500-Watts-Portable-Power-Station/5015317947)
- [The Home Depot Affiliate Program FAQ](https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs)
- [Handoff: Does Handoff have an API?](https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api)

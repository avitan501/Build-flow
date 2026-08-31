# Official material provider access

Avantia's provider layer fails closed. Environment variables alone cannot turn
an unreviewed source live: the provider adapter and the reviewed source policy
must both be enabled. Credentials remain server-side.

## Lowe's — closest live integration

Official product search, product details, store-aware price and inventory are
documented in the [Lowe's Developer Hub](https://developer.lowes.com/). The
credential-free adapter and safety gates are implemented.

External action required: David must register Avantia's organization/app, ask
for Product Catalog search/details plus store pricing and inventory, complete
the partner production review, and provide the approved `X-Client-Id` and
bearer-token mechanism to the backend secret store. Contract/private pricing
must be separately approved; it is not enabled by default.

## The Home Depot — official feed, not scraping

The [Home Depot Affiliate Program FAQ](https://www.homedepot.com/c/SF_MS_Affiliate_Program_FAQs)
documents a daily product data feed for accepted affiliates through Impact.

External action required: David must apply with the live Avantia site, obtain
acceptance into The Home Depot program in Impact, and request the official feed,
schema, credentials, permitted uses, and refresh terms. Once supplied, map that
exact feed into the existing disabled adapter. Do not scrape product pages.

## Handoff — no API currently available

Handoff's official article [Does Handoff have an API?](https://help.handoff.ai/en/articles/9778505-does-handoff-have-an-api)
states that no API is currently available.

External action required: ask Handoff Support for future licensed partner API
access and written data-use terms. Until Handoff supplies an official contract,
documentation and credentials, the adapter remains disabled and performs no
network requests.

## Runtime price rules

- Product identity is separate from a price observation.
- A price needs vendor, unit/package, HTTPS source, checked time and expiration.
- Expired observations remain historical and cannot be called current.
- Private observations need a safe account reference and remain manager-only.
- No source proves compatibility, stock, delivery, or customer intent by itself.

# ABC Supply certification readiness

Updated: August 25, 2026

## Official workflow implemented

AvantiaBuild follows this sequence:

1. The customer authorizes AvantiaBuild through myABCsupply OAuth.
2. AvantiaBuild retrieves the customer’s Ship-To accounts.
3. The customer selects one Ship-To account.
4. AvantiaBuild displays only ABC branches returned for that Ship-To.
5. The customer searches products available at the selected branch.
6. The customer selects a unit of measure returned by ABC and enters quantity.
7. AvantiaBuild validates availability and requests the private price using the selected Ship-To, branch, item, unit, and quantity.

## Certification boundaries

- ABC Supply remains the material seller.
- AvantiaBuild does not publish ABC private pricing or compare it against competing suppliers.
- AvantiaBuild does not submit ABC orders in the current certification scope.
- The public New York branch directory is informational only. A branch is price-eligible only when ABC returns it for the selected customer Ship-To.
- Sandbox accounts, branches, products, and prices remain test data until ABC grants production access and attaches the production account configuration.
- A successful `$0.00` response is treated as missing branch-configured pricing, not a free item.

## New York readiness

AvantiaBuild’s service area is Cedarhurst, New York 11516. The interface can show ABC’s public New York locations, but ABC must authorize the applicable New York branch for the customer’s Ship-To account before private pricing can be requested from that location.

## Support plan

- Primary integration contact: David Avitan
- Company: AvantiaBuild
- Email: office@build.avantiap.com
- AvantiaBuild supports connection and workflow issues.
- ABC Supply controls customer-account access, branch authorization, availability, final prices, delivery, and purchasing.

## Official ABC references

- [Getting Started](https://apidocs.abcsupply.com/getting-started/)
- [API Overview](https://apidocs.abcsupply.com/api-overview/)
- [Third-Party Aggregator Integration Track](https://apidocs.abcsupply.com/third-party-aggregator-integration-track/)
- [Authorization Methods](https://apidocs.abcsupply.com/authorization-methods/)
- [Search Accounts](https://apidocs.abcsupply.com/search-accounts/)
- [Search Branches](https://apidocs.abcsupply.com/search-branches/)
- [Search Items](https://apidocs.abcsupply.com/search-items/)
- [Search Item Availability](https://apidocs.abcsupply.com/search-item-availability/)
- [Price Items](https://apidocs.abcsupply.com/price-items/)
- [Place Orders](https://apidocs.abcsupply.com/place-orders/)

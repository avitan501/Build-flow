# Trusted supplier-product review — local candidate

Owner: Noam. Worktree `/tmp/avantia-safe-product-match-20260914`, branch `codex/safe-product-match-20260914`, based on safe-match commit `937bd159` (itself based on coordinated `7a2483cc`). No production deployment, migration, supplier message, order or business write occurred.

## Implemented

- Expanded product offers have a compact explicit source/specification review with required acknowledgement and typed verified selling unit. Supplier wording is retained. Absent wording cannot be confirmed; unavailable/excluded lines and incompatible explicit selling units stay blocked.
- Private staff confirmation records preserve actor, time, original item/supplier/price snapshot and fingerprint. Exact textual match and human-reviewed commercial equivalence remain distinct states. Human review does not perform a price conversion or guarantee technical compatibility.
- Only authenticated server reads decorate prices with confirmation evidence. Missing migration or denied evidence read fails closed to no confirmation, without a PostgREST cross-schema relationship dependency.
- Eligibility is checked in product cards, saved choices, cheapest-per-product, whole-bid analysis, award and request Step2 completion. Original manual-confirm action no longer deletes supplier notes.
- Meaningful item/price/supplier changes revoke confirmations; restoring old values does not revive them. Confirmation insert/revoke/delete invalidates in-flight choice CAS. Revoked rows remain historical while their parent price exists; deleting that price cascades its evidence. This is not an independent permanent order ledger.
- Single-supplier award now uses the service-only `staff_award_reviewed_product_bid(comparison,item bid,actor,expected request rows)` entry. The application validates current request coverage/specifications before calling; SQL independently validates the actor, locks comparison/request rows, compares the exact request snapshot and checks every item’s price and trusted match. The old public two-argument award function is disabled and all public/authenticated execution revoked.
- `quote_product_match_is_eligible(item_id,bid_id)` is the reusable SQL predicate for later mixed-route finalization. Callers must hold item/bid/price locks. No mixed-route finalization was added here.

## Evidence

- 62 focused tests passed: comparison/choice action guards, unchanged supplier text, missing/contradictory wording, human-reviewed alternate names, unit rejection, source/price/spec/supplier invalidation, excluded suppliers and confirmation fingerprint invalidation.
- Disposable `postgres:16-alpine`, container `avantia-noam-match-20260914`, network `none`, no ports: migration installed; forged authenticated writes and legacy award denied; current human review succeeds; stale snapshot/unit conversion rejected; source text preserved; declined supplier not revived; changed/reverted price does not revive old review; partial quote and stale request award rejected. SQL fixture is `tests/product-match-confirmation.local.sql`; this is not production auth/end-to-end evidence.
- Actual new React review on local Next port3107 at390/1440: confirmation disabled without acknowledgement/unit; interrupted POST retains source and inputs, shows failure, no horizontal overflow. All POST requests aborted; no source/DB write. Screens `/tmp/step2-human-review-390.png`, `/tmp/step2-human-review-1440.png`. Temporary fixture removed and server stopped afterward.
- Scoped ESLint, whitespace and standalone TypeScript checks passed. Final integrated production build/live checks remain root’s gate.

## Coupled release requirements

Migration `20260914225701_trusted_product_match.sql` and updated award server action must ship together. The migration deliberately disables the old public award before enabling only the verified server path. Verify live project identity and migration hash; do not apply from stale local environment credentials.

Root must preserve Maya’s independent Step1 supplier-gate and original-item-source fixes, and reviewer’s independent mixed-route work. This branch predates those changes; merge only its scoped commit, never deploy this older branch wholesale.

## Remaining limitations

- Live authenticated persistence and full browser → server → real DB confirmation/award remain untested here; no100%/live claim.
- Staff-entered manual prices without actual supplier source wording remain blocked for match approval; do not erase or fabricate source text to bypass review.
- Client send/quote autosave and mixed-route materialization are separate workstreams. Supplier quantity/package conversion and engineering equivalence are not automated by this confirmation.

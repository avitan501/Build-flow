# Vercel Optimization Report — Avantia

**Stack**: next@16.3.4 | app-router  ·  **Plan**: hobby  ·  **Period**: (unavailable)  ·  **Observability**: Per-route metrics unavailable — limited analysis based on scanner findings

_Generated 2026-10-29T18:14:02.993Z_

## Cost breakdown

_`vercel usage` returned `EXIT_1`; no billing breakdown was available from the Vercel CLI. Without per-route function GB-hour data, this report cannot rank cost drivers._

## Highest-impact recommendations

_No recommendations are ready to apply from this run._

## Recommendations

### High impact

_(none)_

### Medium impact

_(none)_

## Detailed recommendations

_No recommendations are ready to apply from this run._

## Platform recommendations

_(none — the gate did not surface any platform-scope recommendations)_

## Investigated, no change recommended

These candidates were checked and did not produce a supported change.

| Candidate | Why no recommendation shipped |
|---|---|
| Region Misconfig on app/api/delivery/curri/quote/route.ts | The reviewed delivery handlers explicitly use iad1 (app/api/delivery/curri/quote/route.ts:10 and app/api/delivery/goshare/quote/route.ts:10). A single region is not evidence of excess CPU. User-geography, database-location and route-level CPU metrics are unavailable; no region change is justified. |

## Not investigated in this run

_(no candidates were held back)_

## Strengths

- Fluid Compute is enabled (`defaultResourceConfig.fluid=true`) — instance reuse + reduced cold starts active.
- Function regions: `iad1` (single region).

## Configuration notes

- Function memory tier: Standard (2GB) — the cost-efficient default; upgrade to Performance (4GB) only with memory, CPU-bound, or latency-sensitive route evidence.

## Data gaps

- Per-route metrics unavailable — Observability Plus was not detected for this scope.
- `vercel usage` returned `EXIT_1`; no billing breakdown was available from the Vercel CLI.

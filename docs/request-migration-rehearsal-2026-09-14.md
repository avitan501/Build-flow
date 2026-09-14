# Combined request migration rehearsal — Noam

Candidate: `49f4becb` (includes `a2846944` trusted-match NOWAIT repair).
Worktree: `/tmp/avantia-request-migration-rehearsal-20260914`.

## Baseline provenance

Read-only catalog queries against confirmed active project `nprfhspwdflpqlopydmp` captured **metadata only**, not business records or secrets:

- All columns, defaults and nullability of nine relevant tables (`profiles`, `projects`, requests/items/attachments and comparisons/items/bids/prices).
- 81 actual constraints, 29 additional indexes, 28 RLS policies, 149 role-table grants.
- 14 existing trigger definitions and their functions, including immutable supplier provenance, comparison source-link protection, immutable public request number, updated timestamps and activity/push triggers.
- Four actual private authorization helper definitions.

These captures are durable JSON fixtures under `tests/fixtures/request-schema-*-20260914.json`. The harness reconstructs them in an empty PostgreSQL database; it does not use nullable approximations of the affected business tables.

Local dependency shells are explicit: synthetic `auth.users` plus test UID/JWT functions; supplier-quote and questionnaire FK target IDs; staff grants; activity log target; a local push-event recorder instead of external delivery. The real captured trigger functions are installed unchanged. This verifies local database composition, **not** JWT issuance, external notification delivery, entire production schema or all application writes.

## Combined installation

All five pending migrations installed together, in order:

1. `20260914175308_request_workflow_steps.sql`
2. `20260914191309_request_item_edit_receipts.sql`
3. `20260914191336_product_choice_autosave.sql`
4. `20260914225145_request_source_attachment_fence.sql`
5. `20260914225701_trusted_product_match.sql`

Final local schema: **104 constraints, 23 non-internal triggers**. No duplicate review/edit RPC signature or installation failure.

## Verified interactions

Run `node tests/request-migrations-combined.local.mjs`.

- Approved Carlos can read/write internal step coordination; David can read steps/review history.
- Unauthorized staff cannot read/write workflow/review data or read private edit receipts; authenticated clients cannot call service-only edit/confirmation or legacy award entry points.
- Item edit produces a private receipt. Supplier attachment leaves original-source snapshot unchanged; client attachment changes the source fence. A subsequent stale undo is rejected and the reviewed item remains intact.
- Human match confirmation works with actual numeric types and increases choice revision. A price change revokes it without erasing supplier wording. Stale draft revision cannot write.
- Actual quantity/NOT NULL constraints, immutable source-link trigger and public-number trigger reject invalid mutations.
- No push delivery recorded during these operations.

The harness checks the named container has Docker network mode `none`, accepts no production database URL, and drops only its newly generated local database after each run. Captured metadata and test files are the only repository changes; no application or migration edits and no production writes.

Fixture-only setup failures were corrected during development: authorization helper dependency order, PostgreSQL roles-array representation, public-number sequence lower bound, and synthetic JWT helper access. Final combined run passes with captured grants rather than modeled CRUD privileges.

## Remaining release gate

The mixed-route migration is still being hardened by its owner. The harness accepts an optional frozen migration path as its first argument and installs it after the five above; mixed-route behavioral scenarios must also be run before claiming that additional workflow verified. First-five success is **not** permission to publish an incomplete mixed-route candidate or claim live testing complete.

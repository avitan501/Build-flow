# Part 10: Canonical supplier source

## Production source inventory

The production code at `8b9767f2a3ac6e1b0e2e289d5a338d346197ef1d`
has several supplier sources with different responsibilities. None can be
deleted or rewritten safely in one release.

| Source | Current responsibility | Identity/history that must remain |
| --- | --- | --- |
| `workflow_manager_settings.state.qualificationSettings.suppliers` | Live editable supplier directory, contacts, trust, departments, delivery details, relationship updates | Existing text IDs are referenced throughout pricing, request routing, catalog prices, and quote history |
| `private.supplier_directory_tombstones` | Permanent deletion protection for directory IDs | Every tombstone and deletion timestamp |
| `affiliate_programs` | Affiliate/API/partner application state | Program UUID and all fields |
| `affiliate_program_activities`, `affiliate_program_checklist`, `affiliate_program_attachments`, `affiliate_integrations` | Affiliate evidence and history | Foreign keys, files, dated activity, checklist state |
| `manager_goals` with `supplier_partner_v2:` | Progress for the 44 researched show suppliers | Goal row ID, partner slug, status, importance, notes |
| `manager_goals` with `supplier_network_options_v1:` | Network stage, priority, status, channels, hide state, and note | Goal row ID and existing canonical-name key |
| `lib/affiliate-call-list.ts` | 50 researched supplier/program targets | Rank, script, public contact route, terms evidence |
| `data/supplier-partners.json` and `lib/supplier-partners/catalog.ts` | 44 show supplier records | Slug, public source evidence, scripts, local assets |
| `lib/trial-vendors.ts` | 55 unique trial suppliers across 90 department rows | Source ID and department membership |
| `lib/shop-qualification.ts` | Nine safe defaults for an empty/local directory | Stable fallback IDs used by default routing |
| Request, quote, catalog, document, and comparison tables | Transaction history and supplier snapshots | `supplier_id` text values plus the saved name/contact/price snapshots |

Current consumers include Supplier Directory, Supplier Relationships, Catalog,
Documents, Supplier Quotes, Supplier Requests, Quote Comparison, Supplier
Approvals, Material Requests, Manager settings, and the messaging broker.

## Application unification in this commit

This commit makes the existing Supplier Directory the operational canonical
record without moving or deleting production data.

- Alias names such as Home Depot/Home Depot Pro and Lowe's/Lowe's Creator resolve
  to one read-model identity.
- Every merged row retains each original source type and source ID.
- If duplicate directory entries resolve to one identity, every directory ID is
  retained in `directorySupplierIds`; no record is deleted or rewritten.
- The live directory remains authoritative for editable identity, contact,
  trust, delivery, and relationship-note fields. Research sources only enrich
  missing fields.
- Supplier Network and Supplier Directory creates resolve against the same
  canonical key. New names use a deterministic ID, so alias/concurrent creates
  remain idempotent through the existing directory RPC.
- A supplier typed into a material-request route is resolved against the
  directory or added once as a first-time supplier before its route is saved.
- Request metadata keeps both the canonical text `supplier_id` and a name
  snapshot. Existing routes display the current directory name after an edit,
  while legacy name-only routes continue to resolve by canonical key.
- Request pickers collapse pre-existing alias duplicates to the strongest
  directory record; the directory itself continues to expose all old records so
  no historic ID is silently hidden from administrative cleanup.
- Affiliate activity, files, quote history, manager goals, and tombstones are
  untouched.

## Migration decision

No schema migration is required for this application-layer unification. The
existing atomic `staff_upsert_supplier_directory_entry` RPC, directory snapshot,
text supplier IDs, and request JSON metadata already support the required
identity link. No migration was created or applied.

A future physical normalization into relational canonical tables is optional,
not required for this task. If selected later, the safe sequence is:

1. **Reconciliation report (read only).** Export only IDs, names, source types,
   and reference counts from production ref `nprfhspwdflpqlopydmp`. Review every
   canonical group with more than one directory ID or conflicting supplier.
2. **Additive schema.** Add `supplier_entities` and `supplier_source_links` with
   RLS, staff/owner authorization, and unique `(source_type, source_id)`. Do not
   alter or delete any legacy column or JSON.
3. **Backfill directory identities.** Insert one entity per existing directory
   ID first. Link duplicates only from the approved reconciliation map. Import
   tombstones as inactive links rather than recreating deleted suppliers.
4. **Link enrichment sources.** Link Affiliate UUIDs, partner slugs, research
   ranks, and trial source IDs. Static seed changes must be idempotent and must
   never overwrite manager-edited directory fields.
5. **Link historical rows.** Add nullable `supplier_entity_id` columns to quote,
   request, document, catalog-price, recommendation, and comparison tables.
   Backfill them while retaining every existing text ID and snapshot forever.
6. **Compatibility RPC.** Make the directory RPC return the same JSON contract
   from the canonical tables, then compare it against the legacy JSON result in
   tests before switching one reader at a time.
7. **Dual write and audit.** For a temporary release, write both the canonical
   tables and legacy JSON atomically. Record mismatches; do not auto-merge them.
8. **Reader cutover.** Move Supplier Directory and Supplier Relationships first,
   then Catalog/Documents/Quotes/Requests/Approvals, and the messaging broker
   last. Each flow must pass persistence and historical-link tests.
9. **Legacy freeze.** Only after two verified releases with zero mismatches,
   stop legacy JSON writes. Keep a read-only archive and all snapshot columns.

## Approval gate

No production migration is included in this first step. Before step 2, the owner
must approve the duplicate reconciliation report and the exact production
Supabase target. A database backup, migration dry run, row-count comparison, RLS
advisors, and rollback script are required before production mutation.

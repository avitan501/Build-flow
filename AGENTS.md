<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Production data safety

- Treat the live Avantia Supabase project as read-only by default. Before any production write, independently verify the active project ref is `nprfhspwdflpqlopydmp` from the live deployment binding.
- Never hard-delete or overwrite customer, lead, request, project, catalog, estimate, proposal, document, communication, pricing-history, or authentication data from a natural-language request alone.
- Permanent deletion requires all of the following in the same task: the exact record identifiers, a read-only impact count, a verified restorable backup, and David's explicit approval of those exact targets. Prefer archive/soft-delete and a 30-day recovery window.
- Never run `drop`, `truncate`, an unscoped `delete`, destructive schema resets, or recursive storage deletion against production. Migrations must be additive and reversible unless David explicitly approves a reviewed destructive migration.
- Never expose or place service-role keys, database passwords, provider tokens, card data, or customer secrets in source code, chat, logs, screenshots, or client-side environment variables.
- Work from an isolated worktree based on the current production commit. Run the relevant tests and review the diff before deployment. Do not deploy from a dirty or stale checkout.
- Permanent-delete server actions are intentionally disabled in production unless `ALLOW_PERMANENT_DATA_DELETION=true` is deliberately enabled for a short, supervised maintenance window. Do not enable that flag without the approval and backup checks above.

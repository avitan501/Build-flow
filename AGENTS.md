<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Production data safety

- Treat the live Avantia Supabase project as read-only by default. Before any production write, independently verify the active project ref is `nprfhspwdflpqlopydmp` from the live deployment binding.
- Never hard-delete or overwrite customer, lead, request, project, catalog, estimate, proposal, document, communication, pricing-history, or authentication data from a natural-language request alone.
- Permanent deletion requires all of the following in the same task: the exact record identifiers, a read-only impact count, a verified restorable backup, and David's explicit approval of those exact targets. Prefer archive/soft-delete and a 30-day recovery window.
- Never run `drop`, `truncate`, an unscoped `delete`, destructive schema resets, or recursive storage deletion against production. Migrations must be additive and reversible unless David explicitly approves a reviewed destructive migration.
- Never expose or place service-role keys, database passwords, provider tokens, card data, or customer secrets in source code, chat, logs, screenshots, or client-side environment variables.
- Work from an isolated worktree based on the current production commit. Run the relevant tests and review the diff before deployment. Do not deploy from a dirty or stale checkout.
- Permanent-delete server actions are intentionally disabled in production unless `ALLOW_PERMANENT_DATA_DELETION=true` is deliberately enabled for a short, supervised maintenance window. Do not enable that flag without the approval and backup checks above.

# Production deployment routing

- The customer-facing production project is Vercel project `build-flow-wfl3` (`prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE`) on team `avitanneto-1804s-projects`. Its primary domain is `https://avantiabuild.com`; keep `https://build.avantiap.com` available only for legacy links.
- The canonical repository is `AV-Design-and-Build-Org/avantia-build`, but Vercel currently reads `avitan501/Build-flow`. Until the Vercel GitHub App is granted access to the organization repository, every production release must push the exact same commit to both `main` branches and verify that both remote SHAs match before triggering or accepting a deployment.
- Never create a second Vercel project, change the production Supabase ref, or deploy a commit that exists in only one of those two repositories.
- A release is complete only after `https://avantiabuild.com/api/release` reports the intended full commit SHA, `environment: production`, and Supabase ref `nprfhspwdflpqlopydmp`.

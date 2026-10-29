# Vercel cleanup — October 29, 2026
User authorized cleanup and CPU review. Sole operator Codex, no deployment.

Verified project prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE, team team_ppEl8INgejzz6LoMr6UhXnfs. Production target dpl_9CHu3dzbnJGNFCEJY6cFjRdegUHb. Inventory 61 records: seven READY production, three READY preview, remaining blocked.

Removed two old branch previews after verifying non-production targets, project ownership, and branch-only vercel.app aliases; no matching active local worktrees or focus ownership found:
- dpl_CGMdaRhrgtjzkXFDWc295NHRmAtB — codex/qualifying-questions-preview
- dpl_89eLb2N2gqDQsJXB8umnU7wC9F8M — haim/client-projects-wireframe
Both DELETE responses200; subsequent list59, all seven READY production retained. Named avantia-build-home-preview.vercel.app retained. Live /api/release still f6e3a28801ee139b6f4caea1db877e0c1241c3e5. No storage savings claimed; usage metric unavailable.

CPU audit: Vercel Optimize collector with explicit project/org and authenticated CLI. Observability Plus unavailable (no_oplus_probe). No route metrics; usage/contract null. User asked to choose limited code-only audit vs enabling Observability Plus; pending. No paid feature/config changes, speculative CPU fixes, customer sends, or database writes.

Limited code audit completed after user approval. Scanned 877 files/197 routes, no supported CPU fix. One server-region finding reviewed; no change justified without geographic/route metrics. Fluid compute already enabled; standard 2GB tier. API usage totals unavailable. No runtime, configuration, paid monitoring or production changes. Temporary local Vercel linkage removed. See LIMITED-AUDIT.md.

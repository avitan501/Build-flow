# Planner reference redesign — 2026-10-07

Objective: match David's supplied seats.aero table reference while preserving all service-planner editing and saved data.

Implementation: white/slate page, alternating gray table rows, subtle rounded borders, blue main-service selection badges, charcoal support badges, and neutral editable fee fields. Native checkbox semantics, keyboard focus, mobile horizontal scrolling/sticky headings and all saved-state mappings are retained. Customer preview and Letter flyer inherit the neutral palette.

Scope: editor.html/runtime.html and generated JSON only. No schema, backend, saved-state or pricing changes. Worktree `/root/avantia-planner-clean-table-20261007`, branch `codex/planner-clean-table-20261007`, baseline `db4283ae909c22cb9e9ea1940807671d5901bd83`. Codex is sole publisher.

Validation: 12 desktop Chromium/mobile WebKit service-planner scenarios passed; diff check clean. Desktop/phone screenshots inspected. Sample flyer.pdf is one Letter landscape page. Full production webpack build/TypeScript passed (153 routes). Release verification pending.

Production: preflight canonical and hook-bound mirror main both match baseline; correct Vercel project/team, no active deployment. Read-only saved-state preflight revision102. No live test writes, messages or database mutations.

Artifacts: desktop.png, desktop-table.png, phone.png, phone-table.png, flyer.pdf. All use local sample data.

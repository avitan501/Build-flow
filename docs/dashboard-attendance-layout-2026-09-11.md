# Dashboard attendance layout — 2026-09-11

Objective: fix the mobile Dashboard screenshot where Carlos attendance totals overlapped the title and clipped off the right edge. Worktree `/tmp/avantia-dashboard-attendance-20260911`, branch `codex/dashboard-attendance-20260911`, based on production website `9ce50cdd`.

Cause: three-column header assigned attendance an automatic intrinsic width, while its long text used nowrap/truncation. This could leave the title track without usable width. Owner rendering additionally nested a Next Link around the clock's own Link, producing invalid nested anchors.

Changes:

- Mobile title and search stay on the first row; attendance occupies a separate full-width row. Desktop retains three columns, with bounded shrinkable tracks.
- Clock text wraps within the available width; decorative indicators do not shrink. Full status/totals remain available without truncation.
- One clock link, with existing intended owner activity-history destination or employee daily-summary destination.
- Compact AI disclosure spans two mobile columns and three desktop columns so opening it cannot create an overflowing implicit column.
- No attendance calculations, intervals, database writes or clock actions changed.

Verification: 14 scoped static/attendance regression tests passed; scoped ESLint and whitespace/secrets review passed. Existing noVNC Chrome synthetic checks passed at320/390/1440 for owner and employee destinations, both closed/open search disclosure: no title/clock overlap, no horizontal overflow, one attendance anchor with correct destination. Fixture rendered the actual Dashboard header and clock with compiled Tailwind; only AI contents were stubbed. Temporary fixture removed. Screenshots `/tmp/avantia-dashboard-attendance-{320,390,1440}.png` (open disclosure). This was not authenticated live verification and did not navigate clock links or mutate attendance.

Integration build and production approval/release remain with primary agent. No deployment or production external action. Frontend/Next guidance preserved existing layout styling and client boundaries; web-interface guidance informed bounded wrapping and semantic single-link fix.

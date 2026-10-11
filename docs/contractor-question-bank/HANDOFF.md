# Contractor question bank — 2026-10-11

David requested a toolbox of questions within the live contractor questionnaire, choosing what to ask rather than following every question. This adds 60 optional questions (10 in each of six sections), two tailored follow-up prompts per bank question, and optional follow-up prompts on the original 15 questions. Each question can be marked Asked. Bank answers have their own notes fields. Sections and questions expand on demand; original questions, priorities, services and editable help plan remain intact.

## Persistence and compatibility
Two optional validated JSON fields (`bankAnswers`, `askedQuestions`) preserve compatibility with existing interview records. No database migration is required. Known question IDs, unique asked markers and 2,500-character notes are enforced server-side. The streamed request cap increases from 100 KB to 1 MB to accommodate a full bank; oversized requests remain rejected. Notes and asked state are scoped to the interview and included in the existing JSON backup, not the customer plan preview. Unchecking Asked preserves notes. Existing revision conflicts and save-failure protections are retained.

## Ownership and verification
Codex sole implementer/publisher. Worktree `/root/avantia-contractor-question-bank-20261011`, branch `codex/contractor-question-bank-20261011`, verified live/canonical baseline `6d73ff24482f6aee302e18f24cd780b2427b944c`.

Five API/schema/store tests passed, including legacy compatibility, unknown/duplicate IDs, note bounds and maximum-size notes. Eight existing interview browser scenarios passed. Two new scenarios passed on desktop Chromium/mobile WebKit, covering legacy records, asked/notes save and reload, category switching, uncheck preserving notes, record separation and private-plan exclusion. Changed-file ESLint/diff checks passed. Mobile bank screenshot visually inspected. Initial browser selector included hint text; test corrected. An initial build and test attempt failed from disk exhaustion; only reproducible build outputs from this and earlier owned questionnaire/planner work were removed. Full final webpack build and TypeScript passed after removing the reproducible build outputs.

No production interview writes or external messages. Existing planner remains outside this change. Candidate and release evidence pending.

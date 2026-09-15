# Account display-name autosave candidate

Scope: only the Name field in My Account. Based on verified live `1efac76a0581cbc388c2c59843f5865d82addc2d`; isolated worktree `/tmp/avantia-account-name-autosave-20260915`.

- Replaced this field's Save form with a 650 ms debounce plus blur save. Phone, email, passwords, notification preferences and financial actions remain unchanged.
- New server action validates the authenticated user against the expected actor, trims a 2–200 character name, and updates only `profiles.full_name` with authenticated `id` plus exact old-name filters (including SQL null). Zero affected rows trigger a self-only current-value read; a different value returns a conflict. An already-matching desired value safely recovers a lost acknowledgement.
- UI serializes writes, keeps newer typing when an older response arrives, stops on errors, offers Retry, and never automatically overwrites a conflict. “Use saved name” explicitly discards the local draft and loads the reviewed baseline. Account-keyed remounts ignore old responses. Unsaved changes/in-flight saves request the browser's unload warning.
- No browser storage of profile names, new schema, external messages, production account edits or deployment.

Verification: 10 Chromium/WebKit Playwright tests passed using the real React component and isolated server-action/auth/PostgREST mocks. Tested debounce/blur, late responses, retry, conflict review, invalid input, account change, authenticated target scoping, nullable baseline CAS, DB errors, and lost acknowledgement recovery. Scoped ESLint and `git diff --check` passed. These mocks do not prove production database persistence. Parent release must perform the combined build and live UI checks; a real name mutation needs separately approved test-account scope.

Guidance: existing project styling retained to keep this change minimal. Installed Next.js server-function guidance and Supabase auth/update documentation informed authentication, narrowly scoped return data, and filtered update semantics. Supabase changelog reviewed; listed recent breaking changes do not affect this query shape. Canonical production remains `https://avantiabuild.com`; legacy domains in skill routing notes are stale.

Known limits: there is no cross-device offline draft synchronization, and an old already-open version of the legacy name form still uses its unchanged legacy action. This is not a claim of sitewide autosave completion.

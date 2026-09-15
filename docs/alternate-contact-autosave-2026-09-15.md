# Alternate contact autosave

Worktree `/tmp/avantia-alternate-contact-autosave-20260915`; implementation based on verified `32279e23` plus required code-only cutover `55eb1144`.

## Boundaries

Only alternate email and alternate phone move to `public.account_contact_settings`. Primary name/phone use existing CAS actions. Login email, auth.phone, password, company/role/security fields and notification preferences remain unchanged. No provider messages or live contact edits were performed.

Migration generated with Supabase CLI: `20260915044324_account_alternate_contact_cas.sql`. It copies precisely two string-valued metadata keys, preserving raw strings including empty strings; non-string/missing values become NULL. No auth.users/profile UPDATE. New-user missing row reads as blank/revision0 and creates on first valid expected0 save. A bad nonzero expected revision does not create a row.

Table has self-only authenticated SELECT RLS, no authenticated direct INSERT/UPDATE/DELETE. Service role has diagnostic SELECT only. A dedicated `account_contact_private` schema (not existing private schema) exposes only one authenticated-only definer body, deriving auth.uid with no caller target ID; it locks the self row, checks revision, validates canonical nullable contacts and increments revision on actual change. Public RPC is SECURITY INVOKER. Explicit revokes cover PUBLIC/anon/authenticated/service_role before narrow grants. Both definer and wrapper have empty search_path.

Server action requires a signed account and matching UI actor, bounds email/phone/revision, normalizes phone and forwards exact revision through the authenticated client. Empty or whitespace contacts explicitly clear to NULL. Lost response returns success only if the stored values already equal the desired values. Concurrent stale full-pair edits return conflict rather than overwriting the other field.

UI is disabled before hydration/recovery and on read failure; never shows editable guessed defaults on DB error. Debounce/blur saves serialize, preserve newer typing, and store actor-scoped pending raw values plus original revision in sessionStorage. Remount requires explicit Retry; conflicts show saved contacts and require explicit acceptance. No old acknowledgement after unmount can clear or continue a newer actor's draft. Storage failure visibly warns to stay until Saved. Session storage is not a cross-device durable draft.

## Legacy and trigger dependencies

Unused legacy unconditional name/phone exports were removed in preparatory commit. Legacy alternate Save remains only a signed fail-closed Reload action, never writes auth metadata. Old forms carry no revision and cannot safely be translated to the new write API.

Read-only live inspection found `auth.users` AFTER INSERT/UPDATE(email,raw_user_meta_data) invokes private.handle_new_user, which upserts profile fields. This workstream avoids that trigger by never updating auth. A separate Noam/root fix addresses existing unrelated metadata updates restoring stale profile values; it is not modified here.

Only account page/actions consume alternate_email/alternate_phone in the inspected repository. Notification booleans likewise have no observed downstream sender enforcement; they retain their existing explicit Save and are not claimed as complete channel suppression.

## Required serialized cutover — do not apply migration first

1. Publish preparatory code-only `55eb1144`: alternate controls disabled with truthful temporary message; stale legacy Save refuses. Password/preferences and name/primary-phone autosave remain active.
2. Verify exact live release and maintenance UI; determine actual deployed function maxDuration or documented conservative hosted maximum, then drain older in-flight account handlers. No guessed duration. Local /account and vercel.json have no override; Vercel actual runtime bound remains root's operational gate.
3. Snapshot aggregate count/hash of ONLY the two source contact fields and auth/profile preservation checks; confirm no older contact writer active. Current read-only aggregate at assessment:25 auth users,0 nonempty alternate email,0 nonempty alternate phone. These are not a substitute for fresh cutover checks.
4. Apply reviewed exact migration, compare copied values to source and permission checks; no user profile writes for testing.
5. Publish full candidate, verify hydrated contacts UI and authorized canonical-noop checks. No fake/reachable contact values should be placed in a real account. Rollback UI to maintenance if needed, retaining table data; do not delete newly saved contacts or silently return to stale auth metadata.

## Verification

-46 combined account React/server tests passed on Chromium and WebKit, including actual SSR/delayed hydration, recovery with original revision, normalized phone/blank clear, invalid inputs, self scope, serial edits, unmount/actor isolation and name/phone regressions.
- Targeted ESLint passed. Standalone TypeScript passed. Final build result accompanies frozen handoff.
- `node tests/account-contacts.local.mjs`: disposable network-none PostgreSQL17; actual migration, preserved metadata, self-RLS, direct-DML/anonymous/service write denial, validation, exact revision CAS, lost acknowledgement, blank-to-NULL, missing-row bad revision and real two-session first-create contention passed. Container removed after test.
- Independent review requested from Noam. Root owns production migration, release and final live checks. No production mutation/deployment by this workstream.

Skills applied: Supabase explicit grants/private privileged boundary and Next/React hydration/cleanup guidance shaped implementation. No new runtime dependency.

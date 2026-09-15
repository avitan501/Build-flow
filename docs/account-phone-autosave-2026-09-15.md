# Primary contact phone autosave

Base: verified production `863e3e21c9a55aecd3f4aa0e95bd5f30f08cb074`.
Worktree: `/tmp/avantia-account-contact-autosave-20260915`.

## Scope

- Replaces only the primary contact phone Save form with debounce/blur autosave.
- Writes only signed-in user's `profiles.phone`; server rejects mismatched actor IDs before admin access. Exact atomic compare-and-set preserves NULL versus empty baseline. A lost acknowledgement succeeds only when stored value already equals requested canonical value.
- Existing US/international normalization retained; validation allows one optional leading plus, formatting punctuation, and 7–15 digits. Clearing an existing phone is rejected, consistent with the prior required phone form.
- No `auth.phone`, login email, password, alternate metadata, notification preference, schema, provider, or production record changes. Existing password-flow behavior is unchanged.
- Alternate contacts/preferences retain their existing explicit Save controls. This is not sitewide autosave completion.

## Recovery and safety

Actor-scoped sessionStorage records the raw pending phone and original expected server baseline before debounce. Same-tab navigation/remount restores it with explicit Retry, not an automatic write. Fresh page values cannot silently replace its original CAS baseline. Conflicts show the current saved phone and require explicit use of that value. Even restored text equal to its old baseline verifies server state rather than falsely reporting Saved.

Unmount cancels the timer and prevents an in-flight acknowledgement from clearing a newer mounted draft or continuing writes after account switching. A mounted successful acknowledgement advances the baseline for newer queued typing. Failed saves preserve text and show Retry. Storage failure warns the user to remain until Saved; browser/tab closure recovery is not guaranteed because storage is session-only. No claim of durable cross-device drafts.

## Files and verification

- `app/account/phone-action.ts`
- `components/buildflow/account-phone-autosave.tsx`
- `components/buildflow/account-settings.tsx`
- `tests/account-phone-autosave.spec.ts`

32 focused account-name/phone tests passed in Chromium and WebKit: debounce/blur, normalization/invalid input, signed-actor scope, NULL/empty CAS, concurrent change, lost acknowledgement, late response, actor remount, saved-value reload, pending draft recovery, original-baseline conflict, equal-baseline recovery and unavailable storage. Noam independently repeated all 32 successfully. Targeted ESLint and standalone TypeScript passed. Full build result recorded in handoff.

Tests execute actual React components and the transpiled server action against synthetic in-memory persistence; they do not write real user profiles. Production persistence verification remains a root-owned, separately authorized release gate. No production changes, migrations, pushes, or deployment performed by this workstream.

Next/React guidance kept the client boundary small and cleanup explicit. The narrowly suppressed effect-state lint rule is documented in code: sessionStorage is browser-only and hydrated after SSR to avoid mismatched server rendering.

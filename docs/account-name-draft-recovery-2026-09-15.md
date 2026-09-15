# Account name draft recovery

Scope: `components/buildflow/account-name-autosave.tsx` only, with dedicated browser tests. Based on verified production `674f04694546d53139d63bc640263fa95db6c85f`. Existing self-only name action, phone, alternate contacts, authentication and database contracts are unchanged.

The name editor saves raw pending text plus its original `expectedName` in `sessionStorage`, keyed by authenticated actor. Reading happens after server rendering while the input remains disabled. Reloading the same browser tab restores unsaved text and requires explicit Retry; typing into a recovered draft does not silently submit it. Retry uses the preserved baseline, allowing the existing server action to detect concurrent edits or recover a lost acknowledgment without rebasing onto another person's name.

Successful acknowledgment removes the draft. A late acknowledgment with newer typing updates the stored baseline before the next queued save. Failed/invalid drafts remain recoverable. Choosing the saved name after a conflict clears the local draft. Changing actors remounts the inner editor even if its caller does not provide a React key; old responses cannot restore another account's state. Unavailable/malformed storage is disclosed without changing the server contract.

## Verification

- Actual React Chromium/WebKit: `tests/account-name-draft-recovery.spec.ts` and existing `tests/account-name-autosave.spec.ts`: **24/24 passed**, 19.2s.
- Dedicated cases: raw text survives actual reload; explicit Retry after recovery; lost acknowledgment with original baseline; conflicting remote change; unkeyed actor switch/late response isolation; queued newer text with updated baseline; invalid blank text/storage unavailable.
- Existing cases: server-rendered input disabled until hydration, debounce/blur, validation, self-only action CAS and lost-ack recovery.
- No production browser name edit or database mutation was performed. Root must integrate, build and deploy, then verify live separately.

## Limits

Recovery is for the same browser tab/session, not cross-device or guaranteed after closing the tab. Restored text is not automatically accepted as current server data. Clearing browser storage removes pending local recovery. This does not implement autosave for unrelated account fields or the whole website.

# Preserve independently saved profile name and phone

Local candidate only; root owns review, production application and deployment.

Read-only production inspection of `nprfhspwdflpqlopydmp` found `private.handle_new_user()` body MD5 `642c6b42639d8e538506cf3666ca223c`. Its existing Auth INSERT/email/metadata UPDATE trigger copied non-empty metadata name/phone even when only unrelated preferences changed. This can overwrite newer profile-only CAS edits.

Aggregate-only impact: 25 linked profiles; 3 names and 8 phones differ from Auth metadata. Non-empty metadata could overwrite 3 names and 1 phone. These are risk counts, not proof of when or why historical divergence occurred. No personal values were exported and no records repaired.

Migration `20260915044821_preserve_profile_edits_on_unrelated_metadata.sql` changes exactly two conflict assignments. On UPDATE, unchanged metadata field text preserves its profile field. A deliberately changed metadata name/phone retains previous non-empty/coalesce semantics. INSERT, email, company, staff grants, approval, active state, owner, ACL and security/search_path are unchanged. Exact fingerprint and unique replacement checks fail closed on a changed function body.

Verification: `node tests/profile-metadata-preserve.local.mjs` passed on isolated network-none PostgreSQL 16 with synthetic records and actual trigger execution. Checks include captured production body fingerprint, bootstrap, unrelated preference/contact metadata, email updates, explicit name and phone updates, empty/null compatibility, active staff bootstrap, unchanged function security metadata and rejection of unexpected/reapplied body. Container removed after execution. `git diff --check` passed. Initial fixture readiness used PostgreSQL's temporary initialization socket; corrected to final TCP loopback readiness before successful rerun.

Skill-guided checks: Supabase documentation confirms Auth trigger failures can affect signup; real local bootstrap tests were therefore included. No production DDL, user modification, external provider operation, migration application or deployment occurred in this slice.

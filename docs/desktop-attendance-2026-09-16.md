# Desktop-only attendance

User approved any computer, not enrollment of one trusted machine. Only check-in/check-out are restricted; pause/resume, summaries, viewing and payroll permissions are unchanged. This is device classification, not attestation: deliberately spoofed device signals or remote desktop remain outside the guarantee.

## Implementation
- `lib/attendance-device.ts`: desktop OS allowlist, mobile/tablet denial, UA mobile hint, iPad desktop-mode touch detection; unknown agents fail closed. Windows touch laptops remain allowed and viewport width is irrelevant.
- Daily summary React control starts disabled on SSR, uses hydration-safe external-store device snapshot, explains phone restrictions without hiding summaries or pay.
- Authenticated server action validates the actual request UA/client hint before RPC; browser touch count is supplemental, not authorization. Per-RPC headers forward classification signals; no shared Supabase client/auth changes.
- Migration adds a private, non-executable-by-client predicate and injects a gate into the existing attendance RPC. Existing identity authority, time state machine, locks, CAS and payroll logic remain unchanged. Exact pre-mutation function MD5 `f2cdb20180a3c5734bcf81ab9754c752` prevents overwriting concurrent changes. No business data updates.

## Verification
- Six policy/server-action tests: Windows/Mac/Linux/ChromeOS, touch laptops, iPhone/Android/iPad desktop mode, unknown UA, server rejects before RPC, forwarding and clear errors.
- Eight actual React browser tests with mobile/tablet and narrow desktop, plus historical missing-checkout regression.
- Actual local PostgreSQL 17 migration/RPC fixture: rejects mobile check-in/out before writes, desktop succeeds, mobile pause/resume preserved, owner-only payment authority/CAS regression passes, restricted helper privileges.
- Full build/typecheck, ESLint, deployment guard and bounded release regressions required before publication.
- Production QA must not create fake attendance or pay entries. Read-only negative RPC checks and live UI device emulation only.

## Release sequence
Website first (forwards browser headers), then migration; verify canonical release, function predicates and browser controls. Older website tabs must refresh. No messaging/template/account changes in this release.

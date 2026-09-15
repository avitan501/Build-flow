# Bound deployment mirror gate

Base: b671a247. The canonical workflow checkout is not the source consumed by its Vercel deploy hook: the bound repository is `avitan501/Build-flow`, branch `main`.

The release guard now resolves that explicit repository/ref and requires its exact SHA to equal GITHUB_SHA during preflight and again immediately inside the trigger before any POST. Missing access, missing branch, unexpected ref, duplicate output or stale SHA fails closed. Canonical main validation and live SHA/Supabase verification remain unchanged. This prevents the observed stale-mirror deployment, but cannot lock an external Git branch against a concurrent change after the final read; serialized release ownership remains required.

Tests: `node --test tests/deployment-guard.test.mjs` (10 pass; all hook calls mocked). No deploy, push, credential changes or application/database edits. Read-only local `git ls-remote` confirmed the explicit mirror at b671a247 during this task. If the Actions checkout token cannot read the mirror, configure approved read access rather than bypassing the gate. No secret is printed or embedded.

The shared skill's legacy-domain preflight was not run: AGENTS explicitly prohibits accessing that retired domain. Repository, current candidate and isolated ownership were checked directly. Root owns master-context recording and publication.

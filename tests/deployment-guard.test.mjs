import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RELEASE_TARGET,
  parseReleaseMarker,
  validateLiveRelease,
  validateReleaseContext,
  validateVercelStatus,
} from "../scripts/production-release-guard.mjs";

const sha = "a".repeat(40);
const parentSha = "b".repeat(40);

function validContext(overrides = {}) {
  return {
    repository: RELEASE_TARGET.repository,
    branch: RELEASE_TARGET.branch,
    sha,
    headSha: sha,
    remoteMainSha: sha,
    dirty: false,
    hasLocalVercelLink: false,
    hasStaleSupabaseRef: false,
    authorEmail: RELEASE_TARGET.approvedAuthorEmails[0],
    subject: `Release ${parentSha} to Vercel`,
    parentSha,
    markerIsEmpty: true,
    supabaseRef: RELEASE_TARGET.supabaseRef,
    vercelTeam: RELEASE_TARGET.vercelTeam,
    vercelProject: RELEASE_TARGET.vercelProject,
    domain: RELEASE_TARGET.domain,
    approvedAuthorEmails: RELEASE_TARGET.approvedAuthorEmails,
    ...overrides,
  };
}

test("release marker must reference its direct parent", () => {
  assert.equal(parseReleaseMarker(`Release ${parentSha} to Vercel`), parentSha);
  assert.equal(parseReleaseMarker("release latest"), null);
  assert.deepEqual(validateReleaseContext(validContext()), []);
  assert.match(
    validateReleaseContext(validContext({ parentSha: "c".repeat(40) })).join(" "),
    /direct parent/,
  );
});

test("release marker must be an empty commit", () => {
  assert.match(
    validateReleaseContext(validContext({ markerIsEmpty: false })).join(" "),
    /must not change files/,
  );
});

test("preflight rejects every wrong production identity", () => {
  const cases = [
    { repository: "someone/else" },
    { branch: "preview" },
    { remoteMainSha: "c".repeat(40) },
    { dirty: true },
    { hasLocalVercelLink: true },
    { hasStaleSupabaseRef: true },
    { authorEmail: "unapproved@example.com" },
    { supabaseRef: RELEASE_TARGET.staleSupabaseRef },
    { vercelTeam: "wrong-team" },
    { vercelProject: "wrong-project" },
    { domain: "https://example.com" },
  ];
  for (const override of cases) {
    assert.ok(
      validateReleaseContext(validContext(override)).length > 0,
      `Expected rejection for ${JSON.stringify(override)}`,
    );
  }
});

test("Vercel status must be fresh and point to the exact team and project", () => {
  const startedAt = "2026-09-02T12:00:00.000Z";
  const status = {
    state: "success",
    updated_at: "2026-09-02T12:00:01.000Z",
    target_url:
      `https://vercel.com/${RELEASE_TARGET.vercelTeam}/${RELEASE_TARGET.vercelProject}/deployment-id`,
  };
  assert.deepEqual(validateVercelStatus(status, startedAt), {
    ready: true,
    error: null,
  });
  assert.equal(
    validateVercelStatus({ ...status, target_url: "https://vercel.com/wrong/project/id" }, startedAt)
      .error,
    "Vercel status points to the wrong team or project.",
  );
  assert.deepEqual(
    validateVercelStatus({ ...status, updated_at: "2026-09-02T11:59:59.000Z" }, startedAt),
    { ready: false, error: null },
  );
});

test("historical blocked-author deployment can never report release success", () => {
  const result = validateVercelStatus(
    {
      state: "failure",
      description: "Deployment was blocked",
      updated_at: "2026-09-02T12:00:01.000Z",
      target_url:
        `https://vercel.com/${RELEASE_TARGET.vercelTeam}/${RELEASE_TARGET.vercelProject}/blocked-id`,
    },
    "2026-09-02T12:00:00.000Z",
  );
  assert.equal(result.ready, false);
  assert.match(result.error, /Deployment was blocked/);
});

test("live release must prove commit, production environment and Supabase ref", () => {
  const payload = {
    status: "ok",
    environment: "production",
    release: sha,
    supabaseRef: RELEASE_TARGET.supabaseRef,
  };
  assert.deepEqual(validateLiveRelease(payload, sha), []);
  assert.ok(
    validateLiveRelease(
      { ...payload, release: "c".repeat(40), supabaseRef: RELEASE_TARGET.staleSupabaseRef },
      sha,
    ).length >= 2,
  );
});

test("release workflow preserves serialization and end-to-end verification", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/vercel-owner-release.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /cancel-in-progress: false/);
  assert.equal(
    workflow.match(/production-release-guard\.mjs preflight/g)?.length,
    2,
  );
  const trigger = workflow.indexOf("production-release-guard.mjs trigger");
  const regression = workflow.indexOf("npm run test:release");
  const cleanGeneratedTypes = workflow.indexOf("rmSync('.next'");
  const build = workflow.indexOf("npm run build");
  const typecheck = workflow.indexOf("npx tsc --noEmit");
  const wait = workflow.indexOf("production-release-guard.mjs wait-vercel");
  const live = workflow.indexOf("production-release-guard.mjs verify-live");
  assert.ok(regression > 0 && regression < trigger);
  assert.ok(cleanGeneratedTypes > regression && cleanGeneratedTypes < build);
  assert.ok(build > regression && build < trigger);
  assert.ok(typecheck > build && typecheck < trigger);
  assert.ok(wait > trigger);
  assert.ok(live > wait);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RELEASE_TARGET,
  parseReleaseMarker,
  validateLiveRelease,
  validateReleaseContext,
  validateVercelStatus,
  verifyDeploymentMirror,
  triggerVercel,
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
    deploymentMainSha: sha,
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
    { deploymentMainSha: "c".repeat(40) },
    { deploymentMainSha: undefined },
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

test("bound mirror must resolve exactly main, not an alias or a stale commit", () => {
  assert.equal(verifyDeploymentMirror(sha, (args) => {
    assert.deepEqual(args, ["ls-remote", "https://github.com/avitan501/Build-flow.git", "refs/heads/main"]);
    return `${sha}\trefs/heads/main`;
  }), sha);
  for (const output of ["", `${parentSha}\trefs/heads/main`, `${sha}\trefs/heads/preview`, `${sha}\trefs/heads/main\n${sha}\trefs/heads/main`]) {
    assert.throws(() => verifyDeploymentMirror(sha, () => output), /Release blocked/);
  }
  assert.throws(() => verifyDeploymentMirror(sha, () => { throw new Error("Access denied"); }), /Access denied/);
});

test("direct hook invocation fails closed before any POST when mirror is stale or unreadable", async () => {
  let posts = 0;
  const send = async () => { posts += 1; throw new Error("Unexpected POST"); };
  for (const read of [() => `${parentSha}\trefs/heads/main`, () => "", () => { throw new Error("Access denied"); }]) {
    await assert.rejects(triggerVercel({ GITHUB_SHA: sha, VERCEL_DEPLOY_HOOK_URL: "https://api.vercel.com/v1/integrations/deploy/synthetic" }, read, send));
  }
  assert.equal(posts, 0);
});

test("matching bound mirror allows one mocked hook POST", async () => {
  let posts = 0;
  await triggerVercel({ GITHUB_SHA: sha, VERCEL_DEPLOY_HOOK_URL: "https://api.vercel.com/v1/integrations/deploy/synthetic" },
    () => `${sha}\trefs/heads/main`, async (_url, options) => {
      assert.equal(options.method, "POST");
      posts += 1;
      return { ok: true, json: async () => ({ job: { id: "synthetic-job", state: "PENDING" } }) };
    });
  assert.equal(posts, 1);
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
  const live = workflow.indexOf("production-release-guard.mjs verify-live");
  assert.ok(regression > 0 && regression < trigger);
  assert.ok(cleanGeneratedTypes > regression && cleanGeneratedTypes < build);
  assert.ok(build > regression && build < trigger);
  assert.ok(typecheck > build && typecheck < trigger);
  assert.ok(live > trigger);
});

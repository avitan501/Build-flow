#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const RELEASE_TARGET = Object.freeze({
  repository: "AV-Design-and-Build-Org/avantia-build",
  branch: "main",
  domain: "https://build.avantiap.com",
  supabaseRef: "nprfhspwdflpqlopydmp",
  staleSupabaseRef: "adrhuwzipjvwiywjmfaa",
  vercelTeam: "av-design-and-builds-projects",
  vercelProject: "avantia-build",
  approvedAuthorEmails: ["sales@avdesignandbuilds.com"],
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseReleaseMarker(subject) {
  const match = /^Release ([a-f0-9]{40}) to Vercel$/i.exec(subject.trim());
  return match ? match[1].toLowerCase() : null;
}

export function validateReleaseContext(context) {
  const errors = [];
  const expected = RELEASE_TARGET;
  const approvedAuthors = context.approvedAuthorEmails?.length
    ? context.approvedAuthorEmails
    : expected.approvedAuthorEmails;

  if (context.repository !== expected.repository)
    errors.push(`Repository must be ${expected.repository}.`);
  if (context.branch !== expected.branch)
    errors.push(`Release branch must be ${expected.branch}.`);
  if (context.supabaseRef !== expected.supabaseRef)
    errors.push(`Production Supabase ref must be ${expected.supabaseRef}.`);
  if (context.vercelTeam !== expected.vercelTeam)
    errors.push(`Vercel team must be ${expected.vercelTeam}.`);
  if (context.vercelProject !== expected.vercelProject)
    errors.push(`Vercel project must be ${expected.vercelProject}.`);
  if (context.domain !== expected.domain)
    errors.push(`Production domain must be ${expected.domain}.`);
  if (!/^[a-f0-9]{40}$/i.test(context.sha || ""))
    errors.push("Release SHA must be a full 40-character commit SHA.");
  if (context.sha !== context.headSha)
    errors.push("Checked-out commit does not match the requested release SHA.");
  if (context.sha !== context.remoteMainSha)
    errors.push("Release SHA is not the current canonical main commit.");
  if (context.dirty) errors.push("Release checkout must be clean.");
  if (context.hasLocalVercelLink)
    errors.push("Local .vercel links are forbidden for production releases.");
  if (context.hasStaleSupabaseRef)
    errors.push(`Tracked runtime code contains stale Supabase ref ${expected.staleSupabaseRef}.`);
  if (!approvedAuthors.includes((context.authorEmail || "").toLowerCase()))
    errors.push("Commit author is not approved by the production Vercel team.");

  const markerSha = parseReleaseMarker(context.subject || "");
  if ((context.subject || "").startsWith("Release ") && !markerSha)
    errors.push("Release marker subject is malformed.");
  if (markerSha && markerSha !== (context.parentSha || "").toLowerCase())
    errors.push("Release marker must reference its direct parent commit.");
  if (markerSha && !context.markerIsEmpty)
    errors.push("Release marker commit must not change files.");

  return errors;
}

export function validateVercelStatus(status, startedAt) {
  const expectedPrefix =
    `https://vercel.com/${RELEASE_TARGET.vercelTeam}/${RELEASE_TARGET.vercelProject}/`;
  const updatedAt = Date.parse(status?.updated_at || "");
  const startTime = Date.parse(startedAt || "");
  if (!Number.isFinite(updatedAt) || !Number.isFinite(startTime) || updatedAt < startTime)
    return { ready: false, error: null };
  if (status.state === "failure" || status.state === "error")
    return {
      ready: false,
      error: `Vercel deployment failed: ${status.description || status.state}.`,
    };
  if (!String(status?.target_url || "").startsWith(expectedPrefix))
    return { ready: false, error: "Vercel status points to the wrong team or project." };
  if (status.state === "success") return { ready: true, error: null };
  return { ready: false, error: null };
}

export function validateLiveRelease(payload, expectedSha) {
  const errors = [];
  if (payload?.status !== "ok") errors.push("Release endpoint is not healthy.");
  if (payload?.environment !== "production") errors.push("Live environment is not production.");
  if (payload?.release !== expectedSha) errors.push("Live domain is not serving the requested commit.");
  if (payload?.supabaseRef !== RELEASE_TARGET.supabaseRef)
    errors.push("Live domain is connected to the wrong Supabase project.");
  return errors;
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"],
  }).trim();
}

function trackedRuntimeContainsStaleRef() {
  const pathspecs = [
    "app",
    "components",
    "lib",
    "supabase/functions",
    "next.config.ts",
    "vercel.json",
  ];
  try {
    const matches = git([
      "grep",
      "-l",
      "--fixed-strings",
      RELEASE_TARGET.staleSupabaseRef,
      "--",
      ...pathspecs,
    ]);
    return Boolean(matches);
  } catch {
    return false;
  }
}

function currentReleaseContext(env) {
  const remoteLine = git(["ls-remote", "origin", "refs/heads/main"]);
  const remoteMainSha = remoteLine.split(/\s+/)[0] || "";
  const subject = git(["show", "-s", "--format=%s", "HEAD"]);
  const parentSha = git(["rev-parse", "HEAD^"]);
  const markerIsEmpty = !Boolean(
    git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
  );
  return {
    repository: env.GITHUB_REPOSITORY,
    branch: env.GITHUB_REF_NAME,
    sha: env.GITHUB_SHA,
    headSha: git(["rev-parse", "HEAD"]),
    remoteMainSha,
    dirty: Boolean(git(["status", "--porcelain"])),
    hasLocalVercelLink:
      existsSync(".vercel/project.json") || existsSync(".vercel/repo.json"),
    hasStaleSupabaseRef: trackedRuntimeContainsStaleRef(),
    authorEmail: git(["show", "-s", "--format=%ae", "HEAD"]).toLowerCase(),
    subject,
    parentSha,
    markerIsEmpty,
    supabaseRef: env.PRODUCTION_SUPABASE_REF,
    vercelTeam: env.VERCEL_TEAM_SLUG,
    vercelProject: env.VERCEL_PROJECT_SLUG,
    domain: env.PRODUCTION_DOMAIN,
    approvedAuthorEmails: (env.VERCEL_APPROVED_AUTHOR_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerVercel(env) {
  invariant(
    /^https:\/\/api\.vercel\.com\/v1\/integrations\/deploy\//.test(
      env.VERCEL_DEPLOY_HOOK_URL || "",
    ),
    "The scoped Vercel deploy hook is missing or invalid.",
  );
  const response = await fetch(env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
  invariant(response.ok, `Vercel deploy hook returned HTTP ${response.status}.`);
  const payload = await response.json().catch(() => null);
  const state = payload?.job?.state;
  invariant(
    typeof payload?.job?.id === "string" && payload.job.id.length > 0,
    "Vercel accepted no identifiable deployment job.",
  );
  invariant(
    ["PENDING", "QUEUED", "BUILDING", "READY"].includes(state),
    "Vercel did not accept the deployment.",
  );
  console.log(`Vercel accepted the serialized production deployment (${state}).`);
}

async function waitForVercel(env) {
  invariant(env.GITHUB_TOKEN, "GITHUB_TOKEN is required to verify Vercel status.");
  const endpoint =
    `https://api.github.com/repos/${RELEASE_TARGET.repository}/commits/${env.GITHUB_SHA}/status`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "avantia-production-release-guard",
      },
      cache: "no-store",
    });
    invariant(response.ok, `GitHub status check returned HTTP ${response.status}.`);
    const payload = await response.json();
    const status = (payload.statuses || []).find((item) => item.context === "Vercel");
    const result = validateVercelStatus(status, env.RELEASE_STARTED_AT);
    if (result.error) throw new Error(result.error);
    if (result.ready) {
      console.log("Vercel completed the intended team/project deployment.");
      return;
    }
    await sleep(5_000);
  }
  throw new Error("Timed out waiting for the Vercel production deployment.");
}

async function verifyLive(env) {
  const endpoint = `${RELEASE_TARGET.domain}/api/release`;
  let lastErrors = ["Release endpoint has not responded yet."];
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const payload = await response.json().catch(() => null);
      lastErrors = validateLiveRelease(payload, env.GITHUB_SHA);
      if (response.ok && lastErrors.length === 0) {
        console.log(
          `Live verification passed for ${env.GITHUB_SHA} on ${RELEASE_TARGET.domain}.`,
        );
        return;
      }
    } catch (error) {
      lastErrors = [error instanceof Error ? error.message : "Live verification failed."];
    }
    await sleep(3_000);
  }
  throw new Error(`Live verification timed out: ${lastErrors.join(" ")}`);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const command = argv[0];
  if (command === "preflight") {
    const errors = validateReleaseContext(currentReleaseContext(env));
    invariant(errors.length === 0, errors.join("\n"));
    console.log("Avantia production release preflight passed.");
    return;
  }
  if (command === "trigger") return triggerVercel(env);
  if (command === "wait-vercel") return waitForVercel(env);
  if (command === "verify-live") return verifyLive(env);
  throw new Error("Usage: production-release-guard.mjs <preflight|trigger|wait-vercel|verify-live>");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Production release guard failed.");
    process.exitCode = 1;
  });
}

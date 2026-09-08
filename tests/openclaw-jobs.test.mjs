import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

const port = 29000 + Math.floor(Math.random() * 1000);
const endpoint = `http://127.0.0.1:${port}`;
const secret = "test-only-openclaw-job-signing-secret";

function signedRequest(body, nonce = randomUUID()) {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
  return {
    rawBody,
    nonce,
    headers: {
      "Content-Type": "application/json",
      "X-Avantia-Timestamp": timestamp,
      "X-Avantia-Nonce": nonce,
      "X-Avantia-Signature": `sha256=${signature}`,
    },
  };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("test service did not start");
}

test("Hetzner job service enforces signature, replay, allowlist, and OAuth readiness", async (context) => {
  const child = spawn(process.execPath, ["infra/openclaw-lead-jobs/server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), AVANTIA_JOB_SIGNING_SECRET: secret, OPENCLAW_AUTH_PROFILES: "/does/not/exist" },
    stdio: ["ignore", "ignore", "ignore"],
  });
  context.after(async () => {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
  });
  await waitForHealth();

  const unsigned = await fetch(`${endpoint}/v1/jobs`, { method: "POST", body: "{}" });
  assert.equal(unsigned.status, 401);

  const malformedBody = "{";
  const malformedTimestamp = String(Date.now());
  const malformedNonce = randomUUID();
  const malformedSignature = createHmac("sha256", secret).update(`${malformedTimestamp}.${malformedNonce}.${malformedBody}`).digest("hex");
  const malformed = await fetch(`${endpoint}/v1/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Avantia-Timestamp": malformedTimestamp,
      "X-Avantia-Nonce": malformedNonce,
      "X-Avantia-Signature": `sha256=${malformedSignature}`,
    },
    body: malformedBody,
  });
  assert.equal(malformed.status, 400);

  const invalid = signedRequest({ job: "shell", department: "Contractors", zipCode: "11516", limit: 10 });
  const invalidResponse = await fetch(`${endpoint}/v1/jobs`, { method: "POST", headers: invalid.headers, body: invalid.rawBody });
  assert.equal(invalidResponse.status, 400);

  const request = signedRequest({ job: "find_leads", department: "Contractors", zipCode: "11516", limit: 10 });
  const oauthResponse = await fetch(`${endpoint}/v1/jobs`, { method: "POST", headers: request.headers, body: request.rawBody });
  assert.equal(oauthResponse.status, 503);
  assert.equal((await oauthResponse.json()).code, "codex_oauth_required");

  const replay = await fetch(`${endpoint}/v1/jobs`, { method: "POST", headers: request.headers, body: request.rawBody });
  assert.equal(replay.status, 401);
});

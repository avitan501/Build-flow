import "server-only";

import { createHmac, randomUUID } from "node:crypto";

export type OpenClawJobKind = "find_leads" | "find_suppliers";

export type OpenClawSearchResult = {
  name: string;
  company: string;
  category: string;
  location: string;
  website: string | null;
  verifiedPublicEmail: string | null;
  verifiedPublicPhone: string | null;
  sourceUrl: string;
  matchExplanation: string;
  verificationStatus: "verified-public-source" | "needs-contact-enrichment";
};

export type OpenClawJobResponse = {
  ok: boolean;
  provider: "codex_openclaw";
  results: OpenClawSearchResult[];
  partial: boolean;
  fallbackAvailable: boolean;
  code?: string;
  error?: string;
};

function configuration() {
  const endpoint = process.env.OPENCLAW_JOBS_URL?.trim();
  const signingSecret = process.env.OPENCLAW_JOB_SIGNING_SECRET?.trim();
  if (!endpoint || !signingSecret) throw new Error("openclaw_jobs_not_configured");

  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("openclaw_jobs_url_must_use_https");
  return { endpoint: url.toString(), signingSecret };
}

export async function requestOpenClawJob(input: {
  job: OpenClawJobKind;
  department: string;
  zipCode: string;
  limit: number;
}) {
  const { endpoint, signingSecret } = configuration();
  const body = JSON.stringify(input);
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createHmac("sha256", signingSecret)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest("hex");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Avantia-Timestamp": timestamp,
      "X-Avantia-Nonce": nonce,
      "X-Avantia-Signature": `sha256=${signature}`,
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(115_000),
  });
  const payload = await response.json().catch(() => null) as OpenClawJobResponse | null;
  if (!payload || payload.provider !== "codex_openclaw") {
    throw new Error("openclaw_jobs_invalid_response");
  }
  if (!response.ok || !payload.ok) {
    return {
      ...payload,
      ok: false as const,
      results: [] as OpenClawSearchResult[],
    };
  }
  return payload;
}

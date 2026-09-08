import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type DiscoveryFallbackPayload = {
  userId: string;
  job: "find_leads" | "find_suppliers";
  department: string;
  zipCode: string;
  expiresAt: number;
};

export type DiscoveryCandidateIdentity = {
  userId: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  sourceUrl: string;
  category: string;
  location: string;
  matchExplanation: string;
  department: number;
  zipCode: string;
  provider: "codex_openclaw" | "exa_fallback";
};

function secret() {
  const value = process.env.OPENCLAW_JOB_SIGNING_SECRET?.trim();
  if (!value) throw new Error("discovery_fallback_not_configured");
  return value;
}

function signature(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function createDiscoveryFallbackToken(input: Omit<DiscoveryFallbackPayload, "expiresAt">) {
  const encoded = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyDiscoveryFallbackToken(token: string, expected: Omit<DiscoveryFallbackPayload, "expiresAt">) {
  const [encoded, provided, extra] = token.split(".");
  if (!encoded || !provided || extra) return false;
  const expectedSignature = signature(encoded);
  const left = Buffer.from(provided);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DiscoveryFallbackPayload;
    return payload.expiresAt > Date.now()
      && payload.userId === expected.userId
      && payload.job === expected.job
      && payload.department === expected.department
      && payload.zipCode === expected.zipCode;
  } catch {
    return false;
  }
}

function candidateSignature(expiresAt: number, identity: DiscoveryCandidateIdentity) {
  return createHmac("sha256", secret()).update(`lead_candidate.${expiresAt}.${JSON.stringify(identity)}`).digest("base64url");
}

export function createDiscoveryCandidateToken(identity: DiscoveryCandidateIdentity) {
  const expiresAt = Date.now() + 30 * 60_000;
  return `${expiresAt}.${candidateSignature(expiresAt, identity)}`;
}

export function verifyDiscoveryCandidateToken(token: string, identity: DiscoveryCandidateIdentity) {
  const [expiresText, provided, extra] = token.split(".");
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !provided || extra) return false;
  const expected = candidateSignature(expiresAt, identity);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

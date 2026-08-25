import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getAbcSupplyConfig, getAbcUserScope } from "@/lib/abc-supply/config";

export type AbcTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
};

export function createAbcOAuthFlow() {
  const verifier = randomBytes(48).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    state: randomBytes(32).toString("base64url"),
  };
}

export function buildAbcAuthorizationUrl(params: { state: string; challenge: string }) {
  const config = getAbcSupplyConfig();
  const url = new URL(config.authorizationUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", getAbcUserScope());
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

async function requestAbcToken(body: URLSearchParams) {
  const config = getAbcSupplyConfig();
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const payload = await response.json().catch(() => null) as Partial<AbcTokenResponse> & { error?: string; error_description?: string } | null;
  if (!response.ok || !payload?.access_token || !payload.expires_in) {
    throw new Error(payload?.error_description || payload?.error || "ABC authorization failed.");
  }
  return payload as AbcTokenResponse;
}

export function exchangeAbcAuthorizationCode(params: { code: string; verifier: string }) {
  const config = getAbcSupplyConfig();
  return requestAbcToken(new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: config.redirectUri,
    code_verifier: params.verifier,
  }));
}

export function refreshAbcAccessToken(refreshToken: string) {
  return requestAbcToken(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));
}

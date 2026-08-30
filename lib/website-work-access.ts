import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBSITE_WORK_COOKIE = "avantia_website_work_access";
export const WEBSITE_WORK_COOKIE_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.WEBSITE_WORK_PIN_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!value) throw new Error("Website work access is not configured.");
  return value;
}

function signature(userId: string, expiresAt: number) {
  return createHmac("sha256", secret())
    .update(`${userId}.${expiresAt}`)
    .digest("base64url");
}

export function websiteWorkPinMatches(candidate: string) {
  const expected = process.env.WEBSITE_WORK_BOARD_PIN?.trim() || "9999";
  const left = Buffer.from(candidate.trim());
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createWebsiteWorkToken(userId: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + WEBSITE_WORK_COOKIE_SECONDS;
  return `${expiresAt}.${signature(userId, expiresAt)}`;
}

export function verifyWebsiteWorkToken(token: string | undefined, userId: string, now = Date.now()) {
  if (!token) return false;
  const [expiresRaw, provided] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!provided || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
  const expected = signature(userId, expiresAt);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

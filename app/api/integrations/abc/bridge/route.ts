import { NextResponse } from "next/server";

import { canUseAbcSupply } from "@/lib/abc-supply/access";
import { createAbcOAuthAttempt, consumeAbcOAuthAttempt } from "@/lib/abc-supply/attempts";
import { deleteAbcConnection, getAbcConnectionStatus, saveAbcConnection } from "@/lib/abc-supply/connections";
import {
  priceAbcInternalItems,
  searchAbcInternalAccountAccess,
  searchAbcInternalAccounts,
  searchAbcInternalBranches,
  searchAbcInternalItems,
} from "@/lib/abc-supply/internal";
import { buildAbcAuthorizationUrl, createAbcOAuthFlow, exchangeAbcAuthorizationCode } from "@/lib/abc-supply/oauth";
import { priceAbcUserItems, searchAbcUserAccountAccess, searchAbcUserAccounts, searchAbcUserItems } from "@/lib/abc-supply/user";
import type { ProfileRecord } from "@/lib/auth";
import { isOwnerIdentity } from "@/lib/owner-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 60;

type PricingInput = {
  shipToNumber: string;
  branchNumber: string;
  purpose: "estimating" | "quoting" | "ordering";
  itemNumber: string;
  quantity: number;
  uom?: string;
  length?: { value: number; uom: "ft" | "in" };
};

function parsePricingInput(value: unknown): PricingInput | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const shipToNumber = String(body.shipToNumber || "").trim();
  const branchNumber = String(body.branchNumber || "").trim();
  const itemNumber = String(body.itemNumber || "").trim();
  const uom = String(body.uom || "").trim();
  const purpose = String(body.purpose || "estimating");
  const quantity = Number(body.quantity);
  const lengthValue = body.lengthValue === undefined || body.lengthValue === "" ? null : Number(body.lengthValue);
  const lengthUom = String(body.lengthUom || "").trim().toLowerCase();

  if (!/^[A-Za-z0-9-]{1,30}$/.test(shipToNumber)) return null;
  if (!/^[A-Za-z0-9-]{1,12}$/.test(branchNumber)) return null;
  if (!/^[A-Za-z0-9._/-]{1,40}$/.test(itemNumber)) return null;
  if (uom && !/^[A-Za-z0-9-]{1,12}$/.test(uom)) return null;
  if (!("estimating quoting ordering".split(" ")).includes(purpose)) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return null;
  if (lengthValue !== null && (!Number.isFinite(lengthValue) || lengthValue <= 0 || !["ft", "in"].includes(lengthUom))) return null;
  return {
    shipToNumber,
    branchNumber,
    itemNumber,
    quantity,
    purpose: purpose as PricingInput["purpose"],
    ...(uom ? { uom } : {}),
    ...(lengthValue !== null ? { length: { value: lengthValue, uom: lengthUom as "ft" | "in" } } : {}),
  };
}

function branchBelongsToShipTo(
  accounts: Array<{ number: string; branches: Array<{ number: string }> }>,
  shipToNumber: string,
  branchNumber: string,
) {
  return accounts.some((account) => account.number === shipToNumber && account.branches.some((branch) => branch.number === branchNumber));
}

async function authenticateApprovedUser(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;
  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(match[1]);
  if (userError || !userData.user) return null;
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, company_name, phone, role, approval_status, is_active, created_at")
    .eq("id", userData.user.id)
    .maybeSingle<ProfileRecord>();
  if (profileError || !canUseAbcSupply(profile ?? null)) return null;
  return { user: userData.user, profile: profile as ProfileRecord };
}

export async function POST(request: Request) {
  const authenticated = await authenticateApprovedUser(request);
  if (!authenticated) return NextResponse.json({ error: "An active approved AvantiaBuild account is required." }, { status: 401 });

  try {
    const body = await request.json() as { action?: unknown; pricing?: unknown; query?: unknown; shipToNumber?: unknown; branchNumber?: unknown; state?: unknown; code?: unknown; connectionMode?: unknown };
    const action = String(body.action || "");
    const connectedUser = body.connectionMode === "connected-user";
    const owner = isOwnerIdentity({ email: authenticated.user.email || authenticated.profile.email, phone: authenticated.user.phone || authenticated.profile.phone });

    if (action === "connectionStatus") {
      return NextResponse.json({ ok: true, connection: await getAbcConnectionStatus(authenticated.user.id) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (action === "startOAuth") {
      const flow = createAbcOAuthFlow();
      await createAbcOAuthAttempt({ state: flow.state, verifier: flow.verifier, userId: authenticated.user.id });
      return NextResponse.json({ ok: true, authorizationUrl: buildAbcAuthorizationUrl({ state: flow.state, challenge: flow.challenge }).toString() }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (action === "finishOAuth") {
      const code = String(body.code || "").trim();
      const state = String(body.state || "").trim();
      if (!code || !state) return NextResponse.json({ error: "ABC returned an incomplete authorization response." }, { status: 400 });
      const attempt = await consumeAbcOAuthAttempt({ state, expectedUserId: authenticated.user.id });
      await saveAbcConnection(authenticated.user.id, await exchangeAbcAuthorizationCode({ code, verifier: attempt.verifier }));
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (action === "disconnect") {
      await deleteAbcConnection(authenticated.user.id);
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (!connectedUser && !owner) return NextResponse.json({ error: "Owner authentication is required for the ABC server sandbox." }, { status: 403 });

    if (body.action === "accounts") {
      const accounts = connectedUser ? await searchAbcUserAccounts(authenticated.user.id) : await searchAbcInternalAccounts();
      return NextResponse.json({ ok: true, accounts, connectionMode: connectedUser ? "connected-user" : "automatic" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (body.action === "branches") {
      if (connectedUser) return NextResponse.json({ error: "Select branches returned by the connected Ship-To account." }, { status: 400 });
      const state = String(body.state || "NY").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(state)) return NextResponse.json({ error: "Enter a valid two-letter state." }, { status: 400 });
      const branches = await searchAbcInternalBranches(state);
      return NextResponse.json({ ok: true, branches }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (body.action === "searchItems") {
      const query = String(body.query || "").trim();
      const shipToNumber = String(body.shipToNumber || "").trim();
      const branchNumber = String(body.branchNumber || "").trim();
      if (query.length < 2 || query.length > 100 || !/^[A-Za-z0-9._/\- ']+$/.test(query)) {
        return NextResponse.json({ error: "Enter at least two letters or a valid ABC item number." }, { status: 400 });
      }
      if (!/^[A-Za-z0-9-]{1,12}$/.test(branchNumber)) {
        return NextResponse.json({ error: "Select an ABC branch before searching products." }, { status: 400 });
      }
      if (!/^[A-Za-z0-9-]{1,30}$/.test(shipToNumber)) {
        return NextResponse.json({ error: "Select an ABC Ship-To account before searching products." }, { status: 400 });
      }
      const accounts = connectedUser
        ? await searchAbcUserAccountAccess(authenticated.user.id)
        : await searchAbcInternalAccountAccess();
      if (!branchBelongsToShipTo(accounts, shipToNumber, branchNumber)) {
        return NextResponse.json({ error: "Choose a branch ABC returned for the selected Ship-To account." }, { status: 400 });
      }
      const items = connectedUser ? await searchAbcUserItems(authenticated.user.id, query, branchNumber) : await searchAbcInternalItems(query, branchNumber);
      return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (body.action !== "pricing") return NextResponse.json({ error: "Unsupported ABC action." }, { status: 400 });

    const input = parsePricingInput(body.pricing);
    if (!input) return NextResponse.json({ error: "Check the account, branch, item, and quantity fields." }, { status: 400 });
    const authorizedAccounts = connectedUser
      ? await searchAbcUserAccountAccess(authenticated.user.id)
      : await searchAbcInternalAccountAccess();
    if (!branchBelongsToShipTo(authorizedAccounts, input.shipToNumber, input.branchNumber)) {
      return NextResponse.json({ error: "Choose a branch ABC returned for the selected Ship-To account." }, { status: 400 });
    }
    const availableItems = connectedUser
      ? await searchAbcUserItems(authenticated.user.id, input.itemNumber, input.branchNumber)
      : await searchAbcInternalItems(input.itemNumber, input.branchNumber);
    const availableItem = availableItems.find((item) => item.itemNumber === input.itemNumber && item.availableAtSelectedBranch);
    if (!availableItem) return NextResponse.json({ error: "ABC does not list this item for ordering at the selected authorized branch." }, { status: 400 });
    if (input.uom && !availableItem.uoms.some((uom) => uom.code.toUpperCase() === input.uom?.toUpperCase())) {
      return NextResponse.json({ error: "Choose one of the units returned by ABC for this product." }, { status: 400 });
    }

    const pricingRequest = {
      requestId: `AvantiaBuild-${crypto.randomUUID()}`,
      shipToNumber: input.shipToNumber,
      branchNumber: input.branchNumber,
      purpose: input.purpose,
      lines: [{
        id: "1",
        itemNumber: input.itemNumber,
        quantity: input.quantity,
        ...(input.uom ? { uom: input.uom.toUpperCase() } : {}),
        ...(input.length ? { length: input.length } : {}),
      }],
    };
    const response = connectedUser
      ? await priceAbcUserItems(authenticated.user.id, pricingRequest)
      : await priceAbcInternalItems(pricingRequest);
    const line = response.lines[0];
    if (!line) return NextResponse.json({ error: "ABC did not return a pricing line." }, { status: 502 });
    const materialSubtotal = Number(line.unitPrice || 0) * Number(line.quantity || input.quantity);
    const requiresBranchPricing = String(line.status?.code || "").toLowerCase() === "ok" && Number(line.unitPrice || 0) === 0;
    return NextResponse.json({
      ok: true,
      pricing: {
        itemNumber: line.itemNumber,
        quantity: line.quantity,
        uom: line.uom || input.uom || null,
        unitPrice: Number(line.unitPrice || 0),
        currencyCode: line.currency?.code || "USD",
        currencySymbol: line.currency?.symbol || "$",
        materialSubtotal,
        serviceFeePercent: 0,
        serviceFee: 0,
        clientEstimateTotal: materialSubtotal,
        statusCode: line.status?.code || "Unknown",
        statusMessage: requiresBranchPricing ? "ABC returned $0.00 because this branch has not configured the item price. Contact the branch for a real price." : line.status?.message || "No pricing message returned.",
        requiresBranchPricing,
        connectionMode: connectedUser ? "connected-user" : "automatic",
        branchNumber: input.branchNumber,
        shipToNumber: input.shipToNumber,
        pricedAt: new Date().toISOString(),
        availabilityVerified: true,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ABC request failed." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}

import { NextResponse } from "next/server";

import { canUseAbcSupply } from "@/lib/abc-supply/access";
import {
  priceAbcInternalItems,
  searchAbcInternalAccounts,
  searchAbcInternalBranches,
  searchAbcInternalItems,
} from "@/lib/abc-supply/internal";
import type { ProfileRecord } from "@/lib/auth";
import { isOwnerIdentity } from "@/lib/owner-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

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

async function authenticateOwner(request: Request) {
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
  if (!isOwnerIdentity({ email: userData.user.email || profile?.email, phone: userData.user.phone || profile?.phone })) return null;
  return userData.user;
}

export async function POST(request: Request) {
  if (!await authenticateOwner(request)) return NextResponse.json({ error: "Owner authentication required." }, { status: 401 });

  try {
    const body = await request.json() as { action?: unknown; pricing?: unknown; query?: unknown; branchNumber?: unknown; state?: unknown };
    if (body.action === "accounts") {
      const accounts = await searchAbcInternalAccounts();
      return NextResponse.json({ ok: true, accounts, connectionMode: "automatic" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (body.action === "branches") {
      const state = String(body.state || "NY").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(state)) return NextResponse.json({ error: "Enter a valid two-letter state." }, { status: 400 });
      const branches = await searchAbcInternalBranches(state);
      return NextResponse.json({ ok: true, branches }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (body.action === "searchItems") {
      const query = String(body.query || "").trim();
      const branchNumber = String(body.branchNumber || "").trim();
      if (query.length < 2 || query.length > 100 || !/^[A-Za-z0-9._/\- ']+$/.test(query)) {
        return NextResponse.json({ error: "Enter at least two letters or a valid ABC item number." }, { status: 400 });
      }
      if (!/^[A-Za-z0-9-]{1,12}$/.test(branchNumber)) {
        return NextResponse.json({ error: "Select an ABC branch before searching products." }, { status: 400 });
      }
      const items = await searchAbcInternalItems(query, branchNumber);
      return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    if (body.action !== "pricing") return NextResponse.json({ error: "Unsupported ABC action." }, { status: 400 });

    const input = parsePricingInput(body.pricing);
    if (!input) return NextResponse.json({ error: "Check the account, branch, item, and quantity fields." }, { status: 400 });
    const response = await priceAbcInternalItems({
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
    });
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
        connectionMode: "automatic",
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ABC request failed." }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}

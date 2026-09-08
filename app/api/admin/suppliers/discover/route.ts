import { NextResponse } from "next/server";
import { z } from "zod";

import { createDiscoveryFallbackToken, verifyDiscoveryFallbackToken } from "@/lib/discovery-fallback";
import { requestOpenClawJob } from "@/lib/openclaw-job-client";
import { getOwnerAccessSession } from "@/lib/owner-access";
import {
  selectSafeSupplierCandidates,
  SUPPLIER_DISCOVERY_RESULT_LIMIT,
  type SupplierDiscoverySource,
} from "@/lib/supplier-discovery";

export const maxDuration = 120;

const inputSchema = z.object({
  department: z.string().trim().min(2).max(100),
  zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  excludeIdentities: z.array(z.string().trim().min(1).max(240)).max(500).default([]),
  provider: z.enum(["primary", "exa"]).default("primary"),
  exaApprovalToken: z.string().max(2_000).optional(),
  limit: z.number().int().min(1).max(SUPPLIER_DISCOVERY_RESULT_LIMIT).default(SUPPLIER_DISCOVERY_RESULT_LIMIT),
});

type DirectorySupplier = { name?: string | null; portalUrl?: string | null };

async function searchWithExa(input: { apiKey: string; department: string; zipCode: string; excludeDomains: string[] }) {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": input.apiKey },
    body: JSON.stringify({
      query: `Construction material suppliers and distributors selling ${input.department} and serving ZIP code ${input.zipCode}. Find local branches, independent suppliers, distributors, and contractor sales desks. Return official company pages only, not articles, social profiles, maps, or directories.`,
      type: "deep-lite",
      numResults: 40,
      contents: { highlights: { query: "company products departments delivery area and contractor sales services", maxCharacters: 800 }, maxAgeHours: 0 },
      excludeDomains: input.excludeDomains,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error("supplier_discovery_exa_failed");
  const payload = await response.json() as { results?: Array<{ title?: string; url?: string; text?: string; highlights?: string[] }> };
  return (payload.results ?? []).map((result): SupplierDiscoverySource => ({ title: result.title, url: result.url, summary: (result.highlights ?? []).join(" ") || result.text }));
}

export async function POST(request: Request) {
  const auth = await getOwnerAccessSession();
  if (!auth.user || !auth.supabase) return NextResponse.json({ ok: false, error: "Owner sign-in is required." }, { status: 401 });
  if (!auth.isOwner) return NextResponse.json({ ok: false, error: "Only David can run supplier discovery." }, { status: 403 });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a department and a valid ZIP code." }, { status: 400 });
  const zipCode = parsed.data.zipCode.slice(0, 5);
  const requestedLimit = parsed.data.limit;
  const fallbackIdentity = { userId: auth.user.id, job: "find_suppliers" as const, department: parsed.data.department, zipCode };

  try {
    const { data: snapshotData, error: snapshotError } = await auth.supabase.rpc("staff_load_supplier_directory_snapshot");
    if (snapshotError) throw snapshotError;
    const snapshot = snapshotData as { settings?: { suppliers?: DirectorySupplier[] } } | null;
    const existingSuppliers = (snapshot?.settings?.suppliers ?? []).map((supplier) => ({ name: supplier.name, url: supplier.portalUrl }));
    const excludeDomains = parsed.data.excludeIdentities.flatMap((identity) => identity.startsWith("domain:") ? [identity.slice("domain:".length)] : []);

    let provider: "codex_openclaw" | "exa_fallback";
    let sources: SupplierDiscoverySource[];
    let fallbackAvailable = false;
    if (parsed.data.provider === "exa") {
      if (!parsed.data.exaApprovalToken || !verifyDiscoveryFallbackToken(parsed.data.exaApprovalToken, fallbackIdentity)) {
        return NextResponse.json({ ok: false, error: "Run the low-cost search first, then approve Exa if it is needed." }, { status: 400 });
      }
      const apiKey = process.env.EXA_API_KEY?.trim();
      if (!apiKey) return NextResponse.json({ ok: false, error: "Exa fallback is not configured." }, { status: 503 });
      sources = await searchWithExa({ apiKey, department: parsed.data.department, zipCode, excludeDomains });
      provider = "exa_fallback";
    } else {
      const primary = await requestOpenClawJob({ job: "find_suppliers", department: parsed.data.department, zipCode, limit: requestedLimit });
      if (!primary.ok) {
        return NextResponse.json({ ok: false, error: primary.error || "OpenClaw search is unavailable.", code: primary.code, provider: "codex_openclaw", fallbackAvailable: primary.fallbackAvailable, exaApprovalToken: primary.fallbackAvailable ? createDiscoveryFallbackToken(fallbackIdentity) : undefined, exaMayIncurCharge: primary.fallbackAvailable }, { status: 503 });
      }
      sources = primary.results.map((result) => ({ title: result.company || result.name, url: result.sourceUrl, summary: result.matchExplanation }));
      provider = "codex_openclaw";
      fallbackAvailable = primary.fallbackAvailable;
    }

    const suppliers = selectSafeSupplierCandidates({ sources, excludedIdentities: parsed.data.excludeIdentities, existingSuppliers, limit: requestedLimit });
    fallbackAvailable ||= provider === "codex_openclaw" && suppliers.length < requestedLimit;
    console.info("[supplier-discovery] completed", { provider, count: suppliers.length });
    return NextResponse.json({
      ok: true,
      suppliers,
      count: suppliers.length,
      requestedCount: requestedLimit,
      partial: suppliers.length < requestedLimit,
      provider,
      fallbackAvailable,
      exaApprovalToken: fallbackAvailable ? createDiscoveryFallbackToken(fallbackIdentity) : undefined,
      exaMayIncurCharge: fallbackAvailable,
    });
  } catch (error) {
    console.error("[supplier-discovery] failed", { provider: parsed.data.provider === "exa" ? "exa_fallback" : "codex_openclaw", error: error instanceof Error ? error.message : "unknown" });
    if (parsed.data.provider === "primary") {
      return NextResponse.json({ ok: false, error: "OpenClaw search is unavailable. You can approve Exa as a paid fallback.", provider: "codex_openclaw", fallbackAvailable: true, exaApprovalToken: createDiscoveryFallbackToken(fallbackIdentity), exaMayIncurCharge: true }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Supplier discovery is temporarily unavailable." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffProfile } from "@/lib/auth";
import {
  selectSafeSupplierCandidates,
  SUPPLIER_DISCOVERY_RESULT_LIMIT,
  type SupplierDiscoverySource,
} from "@/lib/supplier-discovery";

const inputSchema = z.object({
  department: z.string().trim().min(2).max(100),
  zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  excludeIdentities: z
    .array(z.string().trim().min(1).max(240))
    .max(500)
    .default([]),
});

type DirectorySupplier = {
  name?: string | null;
  portalUrl?: string | null;
};

async function searchWithExistingBroker(input: {
  supabase: Awaited<ReturnType<typeof requireStaffProfile>>["supabase"];
  department: string;
  zipCode: string;
  excludeDomains: string[];
}) {
  const { data, error } = await input.supabase.functions.invoke<{
    ok?: boolean;
    buyNow?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
    callForPrice?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
    error?: string;
  }>("aura-messaging-broker", {
    body: {
      action: "price_research",
      query: `${input.department} construction suppliers and distributors`,
      department: input.department,
      zipCode: input.zipCode,
      excludeDomains: input.excludeDomains,
    },
  });

  if (error || !data?.ok) {
    throw new Error(data?.error || "supplier_discovery_broker_failed");
  }

  return [...(data.buyNow ?? []), ...(data.callForPrice ?? [])].map(
    (item): SupplierDiscoverySource => ({
      title: item.title,
      url: item.url,
      summary: item.snippet,
    }),
  );
}

async function searchWithExa(input: {
  apiKey: string;
  department: string;
  zipCode: string;
  excludeDomains: string[];
}) {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": input.apiKey,
    },
    body: JSON.stringify({
      query: `Construction material suppliers and distributors selling ${input.department} and serving ZIP code ${input.zipCode}. Find local branches, independent suppliers, distributors, and contractor sales desks. Return official company pages only, not articles, social profiles, maps, or directories.`,
      type: "deep-lite",
      numResults: 40,
      contents: {
        highlights: {
          query:
            "company products departments delivery area and contractor sales services",
          maxCharacters: 800,
        },
        maxAgeHours: 0,
      },
      excludeDomains: input.excludeDomains,
    }),
  });

  if (!response.ok) throw new Error("supplier_discovery_exa_failed");
  const payload = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      text?: string;
      highlights?: string[];
    }>;
  };
  return (payload.results ?? []).map(
    (result): SupplierDiscoverySource => ({
      title: result.title,
      url: result.url,
      summary: (result.highlights ?? []).join(" ") || result.text,
    }),
  );
}

export async function POST(request: Request) {
  let auth: Awaited<ReturnType<typeof requireStaffProfile>>;
  try {
    auth = await requireStaffProfile("suppliers");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Manager sign-in is required." },
      { status: 401 },
    );
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a department and a valid ZIP code." },
      { status: 400 },
    );
  }

  try {
    const { data: snapshotData, error: snapshotError } = await auth.supabase.rpc(
      "staff_load_supplier_directory_snapshot",
    );
    if (snapshotError) throw snapshotError;
    const snapshot = snapshotData as {
      settings?: { suppliers?: DirectorySupplier[] };
    } | null;
    const existingSuppliers = (snapshot?.settings?.suppliers ?? []).map(
      (supplier) => ({
        name: supplier.name,
        url: supplier.portalUrl,
      }),
    );
    const excludeDomains = parsed.data.excludeIdentities.flatMap((identity) =>
      identity.startsWith("domain:") ? [identity.slice("domain:".length)] : [],
    );
    const sources = process.env.EXA_API_KEY
      ? await searchWithExa({
          apiKey: process.env.EXA_API_KEY,
          department: parsed.data.department,
          zipCode: parsed.data.zipCode,
          excludeDomains,
        })
      : await searchWithExistingBroker({
          supabase: auth.supabase,
          department: parsed.data.department,
          zipCode: parsed.data.zipCode,
          excludeDomains,
        });
    const suppliers = selectSafeSupplierCandidates({
      sources,
      excludedIdentities: parsed.data.excludeIdentities,
      existingSuppliers,
    });

    return NextResponse.json({
      ok: true,
      suppliers,
      count: suppliers.length,
      requestedCount: SUPPLIER_DISCOVERY_RESULT_LIMIT,
      partial: suppliers.length < SUPPLIER_DISCOVERY_RESULT_LIMIT,
    });
  } catch (error) {
    console.error("Supplier discovery failed", error);
    return NextResponse.json(
      { ok: false, error: "Supplier discovery is temporarily unavailable." },
      { status: 503 },
    );
  }
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatSiteDateTime } from "@/lib/site-date-time";

type AbcAccount = {
  name: string;
  number: string;
  status: string;
  branches: AbcBranch[];
};

type AbcBranch = {
  number: string;
  name: string;
  status: string;
  homeBranch: boolean;
  city?: string;
  state?: string;
  postal?: string;
  addressLine1?: string;
};

type AbcUom = { code: string; name: string; description: string };

type AbcCatalogItem = {
  itemNumber: string;
  itemDescription: string;
  familyName: string;
  status: string;
  isDimensional: boolean;
  color: string;
  imageUrl: string;
  uoms: AbcUom[];
  variations: Array<{ value: number; uom: string }>;
  availableAtSelectedBranch: boolean;
};

type PricingResult = {
  itemNumber: string;
  quantity: number;
  uom: string | null;
  unitPrice: number;
  currencyCode: string;
  materialSubtotal: number;
  serviceFeePercent: number;
  serviceFee: number;
  clientEstimateTotal: number;
  statusCode: string;
  statusMessage: string;
  requiresBranchPricing: boolean;
  connectionMode: "automatic" | "connected-user";
  branchNumber: string;
  shipToNumber: string;
  pricedAt: string;
  availabilityVerified: boolean;
};

function money(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(value);
}

export function AbcSupplyPricing({ connectionMode = "automatic" }: { connectionMode?: "automatic" | "connected-user" }) {
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accounts, setAccounts] = useState<AbcAccount[]>([]);
  const [shipToNumber, setShipToNumber] = useState("");
  const [branchNumber, setBranchNumber] = useState("");
  const [newYorkBranches, setNewYorkBranches] = useState<AbcBranch[]>([]);
  const [query, setQuery] = useState("Roofing");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [items, setItems] = useState<AbcCatalogItem[]>([]);
  const [selectedItemNumber, setSelectedItemNumber] = useState("");
  const [selectedUom, setSelectedUom] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PricingResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.number === shipToNumber) || null,
    [accounts, shipToNumber],
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.itemNumber === selectedItemNumber) || null,
    [items, selectedItemNumber],
  );
  const authorizedNewYorkBranches = useMemo(
    () => selectedAccount?.branches.filter((branch) => branch.state?.toUpperCase() === "NY") || [],
    [selectedAccount],
  );
  const nearbyNewYorkBranches = useMemo(() => {
    const priorityCities = ["Freeport", "Hicksville", "Jamaica", "Brooklyn", "Bronx"];
    return [...newYorkBranches].sort((a, b) => {
      const aCity = a.city || "";
      const bCity = b.city || "";
      const aPriority = priorityCities.indexOf(aCity);
      const bPriority = priorityCities.indexOf(bCity);
      if (aPriority === -1 && bPriority === -1) return aCity.localeCompare(bCity);
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    });
  }, [newYorkBranches]);

  function branchLabel(branch: AbcBranch) {
    const location = [branch.city, branch.state, branch.postal].filter(Boolean).join(", ");
    return `${branch.name}${location && !branch.name.includes(location) ? ` · ${location}` : ""} · Branch ${branch.number}${branch.homeBranch ? " · Home" : ""}`;
  }

  function chooseItem(item: AbcCatalogItem) {
    setSelectedItemNumber(item.itemNumber);
    const stocking = item.uoms.find((uom) => uom.description.toLowerCase() === "stocking");
    setSelectedUom((stocking || item.uoms[0])?.code || "");
    const firstVariation = item.variations[0];
    setSelectedVariation(firstVariation ? `${firstVariation.value}|${firstVariation.uom}` : "");
    setResult(null);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/integrations/abc/accounts?mode=${connectionMode}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { accounts?: AbcAccount[]; error?: string } | AbcAccount[] | null;
        const responseError = payload && !Array.isArray(payload) ? payload.error : undefined;
        if (!response.ok) throw new Error(responseError || "Could not load ABC accounts.");
        if (cancelled) return;
        const nextAccounts = Array.isArray(payload) ? payload : payload?.accounts;
        if (!Array.isArray(nextAccounts) || nextAccounts.length === 0) {
          throw new Error(connectionMode === "connected-user"
            ? "The connected myABCsupply user has no available Ship-To account. Ask the ABC account administrator to grant access."
            : "ABC Sandbox did not return an enrolled Ship-To account. Ask ABC to attach its test account to AvantiaBuild Source System ID 798.");
        }
        setAccounts(nextAccounts);
        const firstAccount = nextAccounts.find((account) => account.status.toLowerCase() === "active") || nextAccounts[0];
        if (firstAccount) {
          setShipToNumber(firstAccount.number);
          const firstBranch = firstAccount.branches.find((branch) => branch.homeBranch) || firstAccount.branches[0];
          if (firstBranch) setBranchNumber(firstBranch.number);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load ABC accounts.");
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => { cancelled = true; };
  }, [connectionMode, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    if (connectionMode !== "automatic") return;
    fetch("/api/integrations/abc/branches", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { branches?: AbcBranch[] } | null;
        if (!cancelled && response.ok && Array.isArray(payload?.branches)) setNewYorkBranches(payload.branches);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [connectionMode]);

  function handleAccountChange(value: string) {
    setShipToNumber(value);
    const account = accounts.find((entry) => entry.number === value);
    const branch = account?.branches.find((entry) => entry.homeBranch) || account?.branches[0];
    setBranchNumber(branch?.number || "");
    setItems([]);
    setHasSearched(false);
    setSelectedItemNumber("");
    setSelectedUom("");
    setSelectedVariation("");
  }

  function handleBranchChange(value: string) {
    setBranchNumber(value);
    setItems([]);
    setHasSearched(false);
    setSelectedItemNumber("");
    setSelectedUom("");
    setSelectedVariation("");
    setResult(null);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchNumber) return;
    setSearching(true);
    setHasSearched(true);
    setError("");
    setResult(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55_000);
    try {
      const response = await fetch(`/api/integrations/abc/catalog?mode=${connectionMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, shipToNumber, branchNumber }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as { items?: AbcCatalogItem[]; error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "Could not search the ABC catalog.");
        setItems([]);
      } else {
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        setItems(nextItems);
        if (nextItems[0]) chooseItem(nextItems[0]);
        else {
          setSelectedItemNumber("");
          setSelectedUom("");
        }
      }
    } catch (searchError) {
      setItems([]);
      setError(searchError instanceof DOMException && searchError.name === "AbortError"
        ? "ABC product search took too long. Try an exact ABC item number or try again."
        : "Could not reach the ABC catalog.");
    } finally {
      window.clearTimeout(timeout);
      setSearching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connectionMode !== "connected-user") {
      setError("Connect the customer's myABCsupply account before requesting private pricing.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/integrations/abc/pricing?mode=${connectionMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    }).catch(() => null);
    if (!response) {
      setError("Could not reach ABC pricing.");
      setLoading(false);
      return;
    }
    const payload = await response.json().catch(() => null) as { error?: string; pricing?: PricingResult } | null;
    if (!response.ok || !payload?.pricing) setError(payload?.error || "ABC pricing request failed.");
    else setResult(payload.pricing);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <section className="grid scroll-mt-24 gap-4 sm:grid-cols-2" aria-label="ABC account and branch selection">
        <label id="ship-to" className="scroll-mt-24 space-y-2 text-sm font-semibold text-slate-800">
          Ship-to account
          {accounts.length ? (
            <select required value={shipToNumber} onChange={(event) => handleAccountChange(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              {accounts.map((account) => <option key={account.number} value={account.number}>{account.name} · {account.number}</option>)}
            </select>
          ) : <input name="shipToNumber" disabled value="" readOnly placeholder={accountsLoading ? "Loading ABC accounts…" : "Waiting for ABC Sandbox enrollment"} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500" />}
        </label>
        <label id="branch" className="scroll-mt-24 space-y-2 text-sm font-semibold text-slate-800">
          ABC branch
          {selectedAccount?.branches.length ? (
            <select required value={branchNumber} onChange={(event) => handleBranchChange(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              {selectedAccount.branches.map((branch) => <option key={branch.number} value={branch.number}>{branchLabel(branch)}</option>)}
            </select>
          ) : <input name="branchNumber" disabled value="" readOnly placeholder="Provided by the selected ABC account" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500" />}
        </label>
      </section>

      {connectionMode === "automatic" ? <div id="branch-directory" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-950">New York branches</p>
        <p className="mt-1">{newYorkBranches.length} locations found. Pricing uses branches linked to the selected Ship-To account.</p>
        {authorizedNewYorkBranches.length
          ? <p className="mt-2 font-semibold text-emerald-700">{authorizedNewYorkBranches.length} New York branch{authorizedNewYorkBranches.length === 1 ? " is" : "es are"} authorized for the selected Ship-To.</p>
          : <p className="mt-2 font-semibold text-amber-800">No New York branch is linked to this sandbox Ship-To.</p>}
        {nearbyNewYorkBranches.length ? <p className="mt-2 text-xs text-slate-500">Nearby public locations: {nearbyNewYorkBranches.slice(0, 3).map(branchLabel).join(" · ")}</p> : null}
      </div> : null}

      <form id="product-search" onSubmit={handleSearch} className="scroll-mt-24 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="text-sm font-semibold text-slate-800" htmlFor="abc-product-search">Search ABC products</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="abc-product-search" value={query} onChange={(event) => setQuery(event.target.value)} required minLength={2} placeholder="Try roofing shingles or an ABC item number" className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
          <button disabled={searching || !branchNumber} className="min-h-12 rounded-2xl bg-slate-950 px-6 font-semibold text-white disabled:opacity-50">{searching ? "Searching ABC…" : "Search ABC catalog"}</button>
        </div>
      </form>

      {!searching && hasSearched && !error && items.length === 0 ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">ABC returned no products for this search at the selected branch. Try a broader product description or another authorized branch.</p> : null}

      {items.length ? <section id="product-results" className="scroll-mt-24 space-y-3" aria-label="ABC product results">
        <div className="flex items-end justify-between gap-3"><div><h3 className="font-semibold text-slate-950">Products</h3><p className="text-sm text-slate-500">{items.length} result{items.length === 1 ? "" : "s"}</p></div></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => <button type="button" key={item.itemNumber} onClick={() => chooseItem(item)} className={`rounded-2xl border p-4 text-left transition ${selectedItemNumber === item.itemNumber ? "border-[#0071e3] bg-sky-50 ring-2 ring-sky-100" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-950">{item.itemDescription}</p><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Available at branch</span></div>
            <p className="mt-2 text-xs text-slate-500">Item {item.itemNumber}{item.color ? ` · ${item.color}` : ""}</p>
            <p className="mt-2 text-xs text-slate-600">Units: {item.uoms.map((uom) => `${uom.name} (${uom.code})`).join(", ") || "ABC default stocking unit"}</p>
          </button>)}
        </div>
      </section> : null}

      {selectedItem ? <form id="unit-quantity" onSubmit={handleSubmit} className="grid scroll-mt-24 gap-4 rounded-[26px] border border-sky-200 bg-sky-50/60 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Selected product</p><p className="mt-1 font-semibold text-slate-950">{selectedItem.itemDescription}</p><p className="mt-1 text-xs text-slate-500">Item {selectedItem.itemNumber} · Branch {branchNumber}</p></div>
        <input type="hidden" name="shipToNumber" value={shipToNumber} />
        <input type="hidden" name="branchNumber" value={branchNumber} />
        <input type="hidden" name="itemNumber" value={selectedItem.itemNumber} />
        <input type="hidden" name="serviceFeePercent" value="0" />
        <input type="hidden" name="purpose" value="estimating" />
        <label className="space-y-2 text-sm font-semibold text-slate-800">Quantity<input name="quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required type="number" min="1" step="1" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4" /></label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Unit of measure
          <select name="uom" required value={selectedUom} onChange={(event) => setSelectedUom(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4">
            {selectedItem.uoms.map((uom) => <option key={`${uom.code}-${uom.description}`} value={uom.code}>{uom.name} ({uom.code}){uom.description ? ` · ${uom.description}` : ""}</option>)}
          </select>
        </label>
        {selectedItem.isDimensional ? <label className="space-y-2 text-sm font-semibold text-slate-800">Required length variation
          <select required value={selectedVariation} onChange={(event) => setSelectedVariation(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4">
            {selectedItem.variations.map((variation) => <option key={`${variation.value}-${variation.uom}`} value={`${variation.value}|${variation.uom}`}>{variation.value} {variation.uom}</option>)}
          </select>
          <input type="hidden" name="lengthValue" value={selectedVariation.split("|")[0] || ""} />
          <input type="hidden" name="lengthUom" value={selectedVariation.split("|")[1] || ""} />
        </label> : null}
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><span className="font-semibold">ABC Supply remains the seller</span></div>
        {connectionMode === "connected-user"
          ? <button disabled={loading || !selectedUom} type="submit" className="min-h-12 rounded-2xl bg-[#0071e3] px-5 font-semibold text-white hover:bg-[#0077ed] disabled:opacity-50">{loading ? "Checking ABC price…" : "Get private ABC price"}</button>
          : <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><p className="font-semibold">Private pricing needs the customer connection.</p><p>The Sandbox catalog can show products, units, and authorized branches. ABC returns a customer-specific price only after the customer connects myABCsupply.</p><Link href="/account/abc" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-xs font-semibold text-white">Connect myABCsupply</Link></div>}
      </form> : null}

      {error ? <div id="abc-status" className="scroll-mt-24 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><p className="font-semibold">ABC needs attention</p><p>{error}</p><button type="button" onClick={() => { setError(""); setAccountsLoading(true); setReloadKey((value) => value + 1); }} className="mt-3 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-950">Reload ABC data</button></div> : null}

      <p className="text-xs leading-5 text-slate-500">Products shown are offered by the selected branch. Availability is not a stock count.</p>

      {result ? (
        <section id="availability-price" className="scroll-mt-24 rounded-[26px] border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{result.connectionMode === "connected-user" ? "Customer-authorized ABC price" : "ABC sandbox API price"}</div><h2 className="mt-1 text-xl font-semibold text-slate-950">{result.itemNumber}</h2><p className="mt-1 text-sm text-slate-600">{result.statusMessage}</p></div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">{result.statusCode}</span>
          </div>
          {result.requiresBranchPricing ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">This is not a free item. Contact the selected ABC branch for pricing.</div> : null}
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-slate-500">ABC unit price</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{money(result.unitPrice, result.currencyCode)} / {result.uom || "unit"}</dd></div>
            <div className="rounded-2xl bg-slate-950 p-4 text-white"><dt className="text-xs text-slate-300">ABC material total</dt><dd className="mt-1 text-lg font-semibold">{money(result.materialSubtotal, result.currencyCode)}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-600">Branch {result.branchNumber} · Ship-To {result.shipToNumber} · {formatSiteDateTime(result.pricedAt)}</p>
        </section>
      ) : null}
    </div>
  );
}

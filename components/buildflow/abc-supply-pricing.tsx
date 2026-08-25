"use client";

import { useEffect, useMemo, useState } from "react";

type AbcAccount = {
  name: string;
  number: string;
  status: string;
  branches: Array<{ number: string; name: string; status: string; homeBranch: boolean }>;
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
};

function money(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(value);
}

export function AbcSupplyPricing() {
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accounts, setAccounts] = useState<AbcAccount[]>([]);
  const [shipToNumber, setShipToNumber] = useState("");
  const [branchNumber, setBranchNumber] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PricingResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.number === shipToNumber) || null,
    [accounts, shipToNumber],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/integrations/abc/accounts", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { accounts?: AbcAccount[]; error?: string } | AbcAccount[] | null;
        const responseError = payload && !Array.isArray(payload) ? payload.error : undefined;
        if (!response.ok) throw new Error(responseError || "Could not load ABC accounts.");
        if (cancelled) return;
        const nextAccounts = Array.isArray(payload) ? payload : payload?.accounts;
        if (!Array.isArray(nextAccounts) || nextAccounts.length === 0) {
          throw new Error("ABC Sandbox did not return an enrolled Ship-To account. Ask ABC to attach its test account to AvantiaBuild Source System ID 798.");
        }
        setAccounts(nextAccounts);
        const demoAccount = nextAccounts.find((account) => account.number === "2010466-2");
        const firstAccount = demoAccount || nextAccounts.find((account) => account.status.toLowerCase() === "active") || nextAccounts[0];
        if (firstAccount) {
          setShipToNumber(firstAccount.number);
          const demoBranch = firstAccount.branches.find((branch) => branch.number === "1281");
          const firstBranch = demoBranch || firstAccount.branches.find((branch) => branch.homeBranch) || firstAccount.branches[0];
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
  }, [reloadKey]);

  function handleAccountChange(value: string) {
    setShipToNumber(value);
    const account = accounts.find((entry) => entry.number === value);
    const branch = account?.branches.find((entry) => entry.homeBranch) || account?.branches[0];
    setBranchNumber(branch?.number || "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/integrations/abc/pricing", {
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
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-700">
        <span className="font-semibold text-slate-950">Plywood example:</span> 5/8-inch CDX plywood, 4×8, 4-ply · ABC item 50MICDX58. Sandbox prices are test data until ABC attaches Avantia Build’s production customer account.
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Seller</p><p className="mt-1 text-sm font-semibold text-slate-900">ABC Supply remains the material seller</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pricing</p><p className="mt-1 text-sm font-semibold text-slate-900">Private to the authorized ABC account</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Orders</p><p className="mt-1 text-sm font-semibold text-slate-900">No order submission is enabled</p></div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-800">
          Ship-to account
          {accounts.length ? (
            <select name="shipToNumber" required value={shipToNumber} onChange={(event) => handleAccountChange(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              {accounts.map((account) => <option key={account.number} value={account.number}>{account.name} · {account.number}</option>)}
            </select>
          ) : <input name="shipToNumber" disabled value="" readOnly placeholder={accountsLoading ? "Loading ABC accounts…" : "Waiting for ABC Sandbox enrollment"} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500" />}
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">
          ABC branch
          {selectedAccount?.branches.length ? (
            <select name="branchNumber" required value={branchNumber} onChange={(event) => setBranchNumber(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              {selectedAccount.branches.map((branch) => <option key={branch.number} value={branch.number}>{branch.name} · {branch.number}{branch.homeBranch ? " · Home" : ""}</option>)}
            </select>
          ) : <input name="branchNumber" disabled value="" readOnly placeholder="Provided by the selected ABC account" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500" />}
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">ABC item number<input name="itemNumber" required defaultValue="50MICDX58" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4" /></label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Quantity<input name="quantity" required type="number" min="1" step="1" defaultValue="1" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4" /></label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Unit of measure<input name="uom" defaultValue="SH" maxLength={12} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4" /></label>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><span className="font-semibold">Avantia Build service fee: 0%</span><br />No service fee is active while the permitted structure is under ABC review.</div>
        <input type="hidden" name="serviceFeePercent" value="0" />
        <input type="hidden" name="purpose" value="estimating" />
        <button disabled={loading || accountsLoading || !shipToNumber || !branchNumber} type="submit" className="min-h-12 rounded-2xl bg-[#0071e3] px-5 font-semibold text-white shadow-[0_14px_30px_rgba(0,113,227,0.2)] hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
          {loading ? "Checking ABC price…" : "Get automatic private ABC price"}
        </button>
      </form>

      {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><p className="font-semibold">ABC Sandbox account setup needs attention</p><p>{error}</p><button type="button" onClick={() => { setError(""); setAccountsLoading(true); setReloadKey((value) => value + 1); }} className="mt-3 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-950">Retry account lookup</button></div> : null}

      <p className="text-xs leading-5 text-slate-500">This sandbox screen only retrieves authorized account and pricing information. It does not publish ABC pricing, compare suppliers, or place an order.</p>

      {result ? (
        <section className="rounded-[26px] border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Automatic ABC API price</div><h2 className="mt-1 text-xl font-semibold text-slate-950">{result.itemNumber}</h2><p className="mt-1 text-sm text-slate-600">{result.statusMessage}</p></div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">{result.statusCode}</span>
          </div>
          {result.requiresBranchPricing ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">This is not a free item. Contact the selected ABC branch for pricing.</div> : null}
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-slate-500">ABC unit price</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{money(result.unitPrice, result.currencyCode)} / {result.uom || "unit"}</dd></div>
            <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-slate-500">Material subtotal</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{money(result.materialSubtotal, result.currencyCode)}</dd></div>
            <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-slate-500">Avantia Build service fee</dt><dd className="mt-1 text-lg font-semibold text-[#0071e3]">Not active · {money(0, result.currencyCode)}</dd></div>
            <div className="rounded-2xl bg-slate-950 p-4 text-white"><dt className="text-xs text-slate-300">Customer estimate total</dt><dd className="mt-1 text-lg font-semibold">{money(result.clientEstimateTotal, result.currencyCode)}</dd></div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

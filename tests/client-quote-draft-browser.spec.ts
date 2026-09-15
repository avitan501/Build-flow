/* eslint-disable @typescript-eslint/no-explicit-any -- isolated browser mock control, no real services */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";
import { completeClientQuoteDraft, draftSourcesEqual, parseClientQuoteDraft } from "../lib/client-quote-draft";

test("incomplete raw text is valid storage, never valid preparation", () => {
  const draft = { version: 1, clientId: "", quoteNumber: "", clientMessage: "  note  ", delivery: "", tax: "-", bulkMarkup: "", prices: { item: { markupPercent: "", clientUnitPrice: "" } } };
  expect(parseClientQuoteDraft(draft)).toEqual(draft);
  expect(completeClientQuoteDraft(parseClientQuoteDraft(draft)!)).toBe(false);
  expect(parseClientQuoteDraft({ ...draft, tax: 3 })).toBeNull();
  expect(parseClientQuoteDraft({ ...draft, version: "1" })).toBeNull();
  expect(parseClientQuoteDraft({ ...draft, clientMessage: "x".repeat(4001) })).toBeNull();
  expect(draftSourcesEqual({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 })).toBe(true);
});

async function mount(page: Page, saved: unknown = null, stale = false, legacy = false, options: { locked?: boolean; routeError?: string; missingRoute?: boolean; staleClient?: boolean } = {}) {
  const modules: string[] = [], seen = new Map<string, number>();
  const stub = (code: string) => { modules.push(code); return modules.length - 1; };
  const actions = stub(`exports.saveClientQuoteAction=async p=>{window.calls.push({kind:'legacy-prepare',payload:p});return {ok:true,data:{clientSnapshot:null}}};exports.sendClientQuoteAction=async(id,snapshot,revision)=>{window.calls.push({kind:'claim',revision});if(revision!==undefined&&(revision!==window.envelope.revision||revision!==window.preparedRevision||JSON.stringify(snapshot)!==JSON.stringify(window.preparedSnapshot)))return{ok:false,error:'Shared draft changed before sending'};window.calls.push({kind:'send'});return{ok:true,data:{recipient:'client@example.invalid'}}};`);
  const draftActions = stub(`exports.loadClientQuoteDraftAction=async()=>({ok:true,data:window.envelope});exports.saveClientQuoteDraftAction=async p=>{window.calls.push({kind:'draft',payload:p});if(window.hold)await new Promise(r=>window.release=r);if(window.fail)return{ok:false,error:'Mock draft failure'};if(window.conflict||p.expectedRevision!==window.envelope.revision||JSON.stringify(p.source)!==JSON.stringify(window.envelope.source))return{ok:false,conflict:true,error:'Shared draft changed'};window.envelope={...window.envelope,draft:p.draft,draftSource:p.source,revision:p.expectedRevision+1};if(window.raceOnSave)window.envelope={...window.envelope,revision:p.expectedRevision+2};return{ok:true,revision:p.expectedRevision+1}};exports.prepareClientQuoteDraftAction=async p=>{window.calls.push({kind:'prepare',payload:{...p,quoteNumber:p.draft.quoteNumber}});if(p.expectedRevision!==window.envelope.revision||JSON.stringify(p.source)!==JSON.stringify(window.envelope.source))return{ok:false,error:'Shared draft changed before prepare'};window.preparedRevision=window.envelope.revision+1;window.preparedSnapshot={...window.envelope.source.client,comparison:{...window.envelope.source.client.comparison,client_quote_status:'ready',quote_number:p.draft.quoteNumber,client_message:p.draft.clientMessage}};const source={...window.envelope.source,client:window.preparedSnapshot};window.envelope={...window.envelope,source,draftSource:source,revision:window.preparedRevision,draft:p.draft};return{ok:true,data:{clientSnapshot:window.preparedSnapshot,draftRevision:window.preparedRevision}}};`);
  const nothing = stub("module.exports=new Proxy({},{get:()=>()=>null})");
  function bundle(file: string): number {
    if (seen.has(file)) return seen.get(file)!;
    const id = stub(""); seen.set(file, id);
    let code = readFileSync(file, "utf8");
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const resolver = createRequire(file);
    modules[id] = code.replace(/require\(["']([^"']+)["']\)/g, (_, name: string) => {
      if (name.endsWith("/client-draft-actions")) return `require(${draftActions})`;
      if (name.endsWith("/actions")) return `require(${actions})`;
      if (["lucide-react", "@/components/buildflow/avantia-build-lockup", "@/lib/supabase/client"].includes(name)) return `require(${nothing})`;
      const base = name.startsWith("@/") ? resolve(name.slice(2)) : "";
      return `require(${bundle(base ? [base + ".ts", base + ".tsx"].find(existsSync)! : resolver.resolve(name))})`;
    });
    return id;
  }
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client"));
  const component = bundle(resolve("components/buildflow/client-quote-builder.tsx")), helper = bundle(resolve("lib/procurement-client-quote.ts"));
  const id = "00000000-0000-4000-8000-000000000100", itemId = "00000000-0000-4000-8000-000000000101", bidId = "00000000-0000-4000-8000-000000000102", clientId = "00000000-0000-4000-8000-000000000103";
  const routeId = "00000000-0000-4000-8000-000000000104";
  const comparison = { id, awarded_bid_id: legacy ? bidId : null, active_route_id: legacy ? null : routeId, client_id: clientId, quote_number: "QUO-001", client_message: "Original", client_delivery_charge: 0, client_tax_percent: 8.875, client_quote_status: options.locked ? "sent" : "draft" };
  const items = [{ id: itemId, comparison_id: id, description: "Valve", specification: "1 inch", quantity: 2, unit: "each", markup_percent: 0, client_unit_price: 20 }];
  const bid = { id: bidId, supplier_name_snapshot: "Fixture supplier", delivery_charge: 0, tax_percent: 0, lead_time_days: null, quote_comparison_prices: [{ item_id: itemId, unit_price: 12, is_available: true }] };
  const procurementRoute = legacy || options.missingRoute ? null : { id: routeId, items: [{ item_id: itemId, unit_cost: 12 }], suppliers: [{ supplier_name: "Fixture supplier" }], material_subtotal: 24, landed_total: 24, delivery_total: 0, supplier_tax_total: 0, client_send_started_at: null };
  const props = { comparison, items, selectedBid: bid, procurementRoute, routeError: options.routeError ?? null, clients: [{ id: clientId, name: "Client", email: "client@example.invalid", companyName: "", phone: "" }], initialAttachments: [], previewMode: false };
  await page.route("https://client-draft.example.test/**", route => route.fulfill({ contentType: "text/html", body: '<main id="root"></main>' }));
  await page.goto("https://client-draft.example.test/");
  await page.addScriptTag({ content: `(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code => `function(module,exports,require){${code}}`).join(",")}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}
    const props=${JSON.stringify(props)},source={client:require(${helper}).finalizedClientSnapshot(props.comparison,props.items),route_current:${!options.routeError},awarded_bid_id:props.comparison.awarded_bid_id,legacy_bid:props.selectedBid,legacy_prices:props.selectedBid.quote_comparison_prices};${options.staleClient ? "source.client={...source.client,comparison:{...source.client.comparison,client_message:'New saved quote'}};" : ""}window.calls=[];window.envelope={source,draft:${JSON.stringify(saved)},draftSource:${stale ? "{}" : "source"},revision:${saved ? 1 : 0},actorId:'staff-actor',updatedBy:'Carlos',locked:${Boolean(options.locked)}};
    const R=require(${react}),root=require(${dom}).createRoot(document.getElementById('root'));let key=0;window.remount=()=>{root.render(R.createElement(require(${component}).ClientQuoteBuilder,{...props,key:++key}))};window.refreshProps=()=>root.render(R.createElement(require(${component}).ClientQuoteBuilder,{...props,comparison:{...props.comparison,client_message:'Incoming staff change'},key}));window.remount();})()` });
}

test("actual quote editor autosaves incomplete fields, restores and waits before sending", async ({ page }) => {
  await mount(page);
  await page.getByLabel("Quote number", { exact: true }).fill("");
  await expect(page.getByRole("button", { name: "Prepare quote", exact: true })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => (window as any).envelope.draft?.quoteNumber)).toBe("");
  await page.evaluate(() => (window as any).remount());
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("");
  await page.evaluate(() => { (window as any).hold = true; });
  await page.getByLabel("Quote number", { exact: true }).fill("QUO-NEW");
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).calls.some((c: any) => c.kind === "draft" && c.payload.draft.quoteNumber === "QUO-NEW"))).toBe(true);
  expect(await page.evaluate(() => (window as any).calls.filter((c: any) => c.kind === "send" || c.kind === "prepare"))).toEqual([]);
  await page.evaluate(() => { (window as any).hold = false; (window as any).release(); });
  await expect.poll(() => page.evaluate(() => (window as any).calls.filter((c: any) => c.kind === "send").length)).toBe(1);
  expect(await page.evaluate(() => (window as any).calls.find((c: any) => c.kind === "prepare").payload.quoteNumber)).toBe("QUO-NEW");
});

test("failed draft and concurrent team conflict retain typing and never send", async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { (window as any).fail = true; });
  await page.getByLabel("Quote number", { exact: true }).fill("FAILED-EDIT");
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect(page.getByText("Your draft has not been saved. Nothing was sent.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("FAILED-EDIT");
  await page.evaluate(() => { (window as any).fail = false; (window as any).conflict = true; });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Shared draft changed", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Review latest draft", exact: true }).click();
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("FAILED-EDIT");
  expect(await page.evaluate(() => (window as any).calls.some((c: any) => c.kind === "send"))).toBe(false);
});

test("source changed draft is reviewed without automatically replacing current prices", async ({ page }) => {
  const old = { version: 1, clientId: "", quoteNumber: "OLD", clientMessage: "Retained previous text", delivery: "", tax: "", bulkMarkup: "", prices: {} };
  await mount(page, old, true);
  await expect(page.getByText("A draft exists from an earlier quote or supplier route. It has not been applied.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Use current quote instead", exact: true }).click();
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("QUO-001");
  expect(await page.evaluate(() => (window as any).calls)).toEqual([]);
  expect(await page.evaluate(() => (window as any).envelope.draft.clientMessage)).toBe("Retained previous text");
});

test("clearing a client price persists blank, never prepares or previews it as zero or cost", async ({ page }) => {
  await mount(page);
  const price = page.getByRole("row").filter({ hasText: "Valve" }).getByRole("spinbutton").nth(1);
  await price.fill("");
  await expect.poll(() => page.evaluate(() => (window as any).envelope.draft?.prices["00000000-0000-4000-8000-000000000101"].clientUnitPrice)).toBe("");
  await page.evaluate(() => (window as any).remount());
  await expect(price).toHaveValue("");
  await expect(page.getByLabel("Quote pricing summary")).toContainText("Draft incomplete");
  await expect(page.getByLabel("Quote pricing summary").getByText("Incomplete", { exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Valve" }).locator("td").last()).toHaveText("—");
  await expect(page.getByRole("button", { name: "Prepare quote", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Preview client copy", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send to client", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => call.kind !== "draft"))).toBe(false);
});

for (const raw of ["", "-1"]) test(`mixed draft summary hides inferred totals for ${raw === "" ? "blank" : "invalid"} price and restores valid totals`, async ({ page }) => {
  await mount(page);
  const summary = page.getByLabel("Quote pricing summary");
  const priceRow = page.getByRole("row").filter({ hasText: "Valve" });
  const price = priceRow.getByRole("spinbutton").nth(1);
  await expect(summary).toContainText("$43.55");
  const completeSummary = await summary.innerText();
  const completeLineProfit = await priceRow.locator("td").last().innerText();
  await price.fill(raw);
  await expect(summary).toContainText("Draft incomplete");
  await expect(summary).not.toContainText("$43.55");
  await expect(summary.getByText("Incomplete", { exact: true })).toBeVisible();
  await expect(summary.getByText("—", { exact: true })).toHaveCount(2);
  // Known supplier costs remain informative; only inferred client results disappear.
  await expect(summary).toContainText("$24.00");
  await expect(priceRow.locator("td").last()).toHaveText("—");
  await expect(page.getByRole("button", { name: "Send to client", exact: true })).toBeDisabled();
  await price.fill("20");
  await expect.poll(() => summary.innerText()).toBe(completeSummary);
  await expect(priceRow.locator("td").last()).toHaveText(completeLineProfit);
  await expect(page.getByRole("button", { name: "Prepare quote", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => ["prepare", "claim", "send"].includes(call.kind)))).toBe(false);
});

test("pricing remains visible without quote identity and explicit zero displays actual loss", async ({ page }) => {
  await mount(page);
  const summary = page.getByLabel("Quote pricing summary");
  await page.getByLabel("Quote number", { exact: true }).fill("");
  await expect(summary).toContainText("$43.55");
  await expect(summary).not.toContainText("Draft incomplete");
  await expect(page.getByRole("button", { name: "Prepare quote", exact: true })).toBeDisabled();
  const row = page.getByRole("row").filter({ hasText: "Valve" });
  await row.getByRole("spinbutton").nth(1).fill("0");
  await expect(summary).not.toContainText("Draft incomplete");
  await expect(summary).toContainText("$0.00");
  await expect(row.locator("td").last()).toContainText("24.00");
  await expect(row.locator("td").last()).toHaveClass(/text-rose-700/);
});

test("invalid tax or delivery hides totals and an already-open preview; invalid bulk apply cannot overwrite prices", async ({ page }) => {
  await mount(page);
  const summary = page.getByLabel("Quote pricing summary");
  await page.getByRole("button", { name: "Preview client copy", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Sales tax %", { exact: true }).fill("101", { force: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const value of ["", "-1", "101"]) {
    await page.getByLabel("Sales tax %", { exact: true }).fill(value);
    await expect(summary).toContainText("Draft incomplete");
  }
  await page.getByLabel("Sales tax %", { exact: true }).fill("8.875");
  // A valid draft may resume its preview; close it before further normal editing.
  await page.getByRole("button", { name: "Close quote preview", exact: true }).click();
  await page.getByLabel("Client delivery charge", { exact: true }).fill("-1");
  await expect(summary).toContainText("Draft incomplete");
  await page.getByLabel("Client delivery charge", { exact: true }).fill("");
  await expect(summary).toContainText("$43.55");
  const price = page.getByRole("row").filter({ hasText: "Valve" }).getByRole("spinbutton").nth(1);
  for (const value of ["", "-1"]) {
    await page.getByLabel("Markup for all").fill(value);
    await expect(page.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
    await expect(price).toHaveValue("20");
  }
  await page.getByLabel("Markup for all").fill("0");
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => ["prepare", "claim", "send"].includes(call.kind)))).toBe(false);
});

test("new typing during save is queued with the acknowledged revision; refresh never erases it", async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { (window as any).hold = true; });
  await page.getByLabel("Quote number", { exact: true }).fill("FIRST-EDIT");
  await expect.poll(() => page.evaluate(() => (window as any).calls.length)).toBe(1);
  await page.getByLabel("Quote number", { exact: true }).fill("NEWER-EDIT");
  await page.evaluate(() => (window as any).refreshProps());
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("NEWER-EDIT");
  await page.evaluate(() => { (window as any).hold = false; (window as any).release(); });
  await expect.poll(() => page.evaluate(() => (window as any).envelope.draft?.quoteNumber)).toBe("NEWER-EDIT");
  expect(await page.evaluate(() => (window as any).calls.map((call: any) => call.payload.expectedRevision))).toEqual([0, 1]);
  const persisted = await page.evaluate(() => (window as any).envelope.draft);
  await page.reload();
  await mount(page, persisted);
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("NEWER-EDIT");
});

test("clean stale shared draft cannot Prepare or Send another editor's older prices", async ({ page }) => {
  await mount(page);
  await expect(page.getByRole("button", { name: "Prepare quote", exact: true })).toBeEnabled();
  await page.evaluate(() => { (window as any).envelope = { ...(window as any).envelope, revision: 2 }; });
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect(page.getByText("Shared draft changed before prepare", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => call.kind === "send" || call.kind === "claim"))).toBe(false);
});

test("another save after flush but before Prepare prevents sending", async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { (window as any).raceOnSave = true; });
  await page.getByLabel("Quote number", { exact: true }).fill("AFTER-FLUSH");
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect(page.getByText("Shared draft changed before prepare", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => call.kind === "send"))).toBe(false);
});

test("Prepare acknowledgment is reused by Send; newer unprepared draft blocks its claim", async ({ page }) => {
  await mount(page);
  await page.getByRole("button", { name: "Prepare quote", exact: true }).click();
  await expect(page.getByText("Quote prepared. You can send it now. Reload and review the saved quote before making further edits.", { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).envelope = { ...(window as any).envelope, revision: (window as any).envelope.revision + 1 }; });
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect(page.getByText("Shared draft changed before sending", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls.filter((call: any) => call.kind === "prepare").length)).toBe(1);
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => call.kind === "send"))).toBe(false);
});

test("legacy single supplier keeps explicit manual Save and no draft writes", async ({ page }) => {
  await mount(page, null, false, true);
  await expect(page.getByLabel("Quote pricing summary")).toContainText("$43.55");
  await expect(page.getByLabel("Quote pricing summary")).not.toContainText("Draft incomplete");
  await page.getByLabel("Quote number", { exact: true }).fill("LEGACY-EDIT");
  await expect(page.getByRole("button", { name: "Save quote", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Save quote", exact: true }).click();
  await expect(page.getByText("Client quote saved. Profit remains visible only to your team.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls.map((call: any) => call.kind))).toEqual(["legacy-prepare"]);
});

test("Prepare then Send succeeds without another preparation or reload", async ({ page }) => {
  await mount(page);
  await page.getByRole("button", { name: "Prepare quote", exact: true }).click();
  await expect(page.getByText("Quote prepared. You can send it now. Reload and review the saved quote before making further edits.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect(page.getByText("Quote sent to client@example.invalid with the branded PDF attached.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls.map((call: any) => call.kind))).toEqual(["prepare", "claim", "send"]);
  await expect(page.getByLabel("Quote number", { exact: true })).toBeDisabled();
});

test("editing after Prepare retains text on source conflict and never sends it", async ({ page }) => {
  await mount(page);
  await page.getByRole("button", { name: "Prepare quote", exact: true }).click();
  await expect(page.getByText("Quote prepared. You can send it now. Reload and review the saved quote before making further edits.", { exact: true })).toBeVisible();
  await page.getByLabel("Quote number", { exact: true }).fill("EDIT-AFTER-PREPARE");
  await expect(page.getByText("Shared draft changed", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Send to client", exact: true }).click();
  await expect(page.getByLabel("Quote number", { exact: true })).toHaveValue("EDIT-AFTER-PREPARE");
  expect(await page.evaluate(() => (window as any).calls.some((call: any) => call.kind === "claim" || call.kind === "send"))).toBe(false);
});

test("locked historical quote can preview stored costs despite supplier-source drift", async ({ page }) => {
  await mount(page, null, false, false, { locked: true, routeError: "Supplier source changed" });
  await page.getByRole("button", { name: "View saved client copy", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Branded quote preview" })).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls)).toEqual([]);
});

test("missing active route never falls through to legacy and stale client snapshot blocks even locked view", async ({ page }) => {
  await mount(page, null, false, false, { missingRoute: true });
  await expect(page.getByRole("alert")).toContainText("not a single-supplier quote");
  await expect(page.getByRole("button", { name: "Save quote", exact: true })).toHaveCount(0);
  await mount(page, null, false, false, { locked: true, staleClient: true });
  await expect(page.getByRole("alert")).toContainText("quote or supplier costs changed");
  await expect(page.getByRole("button", { name: "View saved client copy", exact: true })).toHaveCount(0);
});

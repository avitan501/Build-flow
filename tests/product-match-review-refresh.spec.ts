import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// Render the actual component in a browser; only navigation/server writes are stubs.
async function fixture(page: Page) {
  const modules: Record<string, string> = {}, seen = new Map<string, string>();
  const stub = (code: string) => { const id = String(Object.keys(modules).length); modules[id] = code; return id; };
  const router = stub("exports.useRouter=()=>({refresh(){}})");
  const action = stub("window.calls=[];exports.confirmProductMatchAction=async(input)=>{window.calls.push(input);return {ok:true}}");
  function bundle(file: string): string {
    if (seen.has(file)) return seen.get(file)!;
    const id = stub(""); seen.set(file, id);
    let code = readFileSync(file, "utf8");
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const resolver = createRequire(file);
    modules[id] = code.replace(/require\(["']([^"']+)["']\)/g, (_all, name: string) => {
      if (name === "next/navigation") return `require(${JSON.stringify(router)})`;
      if (name.endsWith("/product-match-actions")) return `require(${JSON.stringify(action)})`;
      const base = name.startsWith("@/") ? resolve(process.cwd(), name.slice(2)) : "";
      const target = base ? [base + ".ts", base + ".tsx"].find(existsSync)! : resolver.resolve(name);
      return `require(${JSON.stringify(bundle(target))})`;
    });
    return id;
  }
  const react = bundle(require.resolve("react")), dom = bundle(require.resolve("react-dom/client"));
  const component = bundle(resolve("components/buildflow/product-match-review.tsx"));
  const item = { id: "item", comparison_id: "comparison", description: "Valve", specification: "4 inch", quantity: 2, unit: "each" };
  const bid = { id: "bid", supplier_id: "supplier", trust_level_snapshot: "verified", quote_comparison_prices: [{ item_id: "item", notes: "Supplier valve 4 inch", unit_price: 12, is_available: true }] };
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: `(()=>{const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(",")}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const root=require(${JSON.stringify(dom)}).createRoot(document.getElementById('root'));window.props={item:${JSON.stringify(item)},bid:${JSON.stringify(bid)},disabled:false,beforeConfirm:async()=>true};window.redraw=()=>root.render(require(${JSON.stringify(react)}).createElement(require(${JSON.stringify(component)}).ProductMatchReview,window.props));window.redraw();})()` });
  await page.locator("summary").click();
}

test("unchanged source retains draft review, changed source clears old consent", async ({ page }) => {
  await fixture(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("textbox").fill("each");
  await expect(page.getByRole("button")).toBeEnabled();
  await page.evaluate(() => (window as unknown as { redraw: () => void }).redraw());
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.evaluate(() => { const w = window as unknown as {props: {bid: {quote_comparison_prices: {unit_price: number}[]}}, redraw: () => void}; w.props = {...w.props, bid: {...w.props.bid, quote_comparison_prices: w.props.bid.quote_comparison_prices.map(p => ({...p, unit_price: 15}))}}; w.redraw(); });
  await expect(page.locator("details")).not.toHaveAttribute("open", "");
  await page.locator("summary").click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("textbox")).toHaveValue("");
  await expect(page.getByRole("button")).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as {calls: unknown[]}).calls.length)).toBe(0);
});

test("source removal does not crash or leave an approval button", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await fixture(page);
  await page.evaluate(() => { const w = window as unknown as {props: {bid: {quote_comparison_prices: {notes: string | null}[]}}, redraw: () => void}; w.props = {...w.props, bid: {...w.props.bid, quote_comparison_prices: w.props.bid.quote_comparison_prices.map(p => ({...p, notes: null}))}}; w.redraw(); });
  await expect(page.getByText("Upload the supplier quote with its original wording before reviewing.")).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  expect(errors).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseProductChoiceDraft, productChoiceFingerprint, productChoiceScopeError, restoreProductChoices } from "../lib/product-choice-draft";
import type { QuoteComparisonItemRecord, QuoteComparisonBidRecord } from "../lib/quote-comparison";

const item = {id:"item",description:"Valve",specification:"",quantity:2,unit:"each"} as QuoteComparisonItemRecord;
const bid = {id:"bid",supplier_id:"supplier",supplier_name_snapshot:"Supplier",trust_level_snapshot:"verified",status:"received",
  quote_comparison_prices:[{bid_id:"bid",item_id:"item",unit_price:12,is_available:true,notes:"Valve"}]} as QuoteComparisonBidRecord;
test("raw choices accept intentional clear but reject malformed and oversized maps",()=>{
  expect(parseProductChoiceDraft({version:1,selections:{item:""}})).toEqual({version:1,selections:{item:""}});
  expect(parseProductChoiceDraft({version:1,selections:[]})).toBeNull();
  expect(parseProductChoiceDraft({version:1,selections:{item:123}})).toBeNull();
  expect(parseProductChoiceDraft({version:1,selections:Object.fromEntries(Array.from({length:1001},(_,i)=>[`item-${i}`,"bid"]))})).toBeNull();
});
test("only current eligible product/bid pairs can persist",()=>{
  const draft={version:1 as const,selections:{item:"bid"}};
  expect(productChoiceScopeError(draft,[item],[bid])).toBeNull();
  expect(productChoiceScopeError(draft,[],[bid])).not.toBeNull();
  expect(productChoiceScopeError(draft,[item],[{...bid,status:"declined"}])).not.toBeNull();
  expect(productChoiceScopeError(draft,[item],[{...bid,quote_comparison_prices:[{...bid.quote_comparison_prices![0],notes:"Unrelated product"}]}])).not.toBeNull();
  expect(productChoiceScopeError({...draft,selections:{item:""}},[item],[bid])).toBeNull();
});
test("changed price, unit, quantity, wording or supplier block invalidates choice evidence",async()=>{
  const fingerprint=await productChoiceFingerprint([item],[bid]);
  for(const changed of [{...item,quantity:3},{...item,unit:"box"},{...item,specification:"4 in"}]) expect(await productChoiceFingerprint([changed],[bid])).not.toBe(fingerprint);
  for(const changed of [{...bid,trust_level_snapshot:"do-not-use" as const},{...bid,quote_comparison_prices:[{...bid.quote_comparison_prices![0],unit_price:13}]}]) expect(await productChoiceFingerprint([item],[changed])).not.toBe(fingerprint);
  const stored={product_choice_draft:{version:1,selections:{item:"bid"}},product_choice_draft_source_fingerprint:fingerprint};
  expect(restoreProductChoices(stored,fingerprint)).toEqual({selections:{item:"bid"},warning:""});
  expect(restoreProductChoices(stored,"changed")).toMatchObject({selections:{}});
  expect(restoreProductChoices(stored,"changed").warning).toContain("previous draft is preserved");
  expect(stored.product_choice_draft.selections.item).toBe("bid");
});
test("server action retains authenticated source/CAS guards without revalidating typing",()=>{
  const action=readFileSync("app/admin/quote-comparison/product-choice-actions.ts","utf8");
  expect(action).toContain('requireStaffProfile("suppliers")');
  expect(action.indexOf('select("status,product_choice_draft_revision")')).toBeLessThan(action.indexOf('from("quote_comparison_items")'));
  expect(action).toContain('.eq("product_choice_draft_revision",input.expectedRevision).in("status",["draft","review"])');
  expect(action).toContain("productChoiceScopeError");
  expect(action).not.toContain("revalidatePath");
  expect(action).not.toContain("sendClient");
});

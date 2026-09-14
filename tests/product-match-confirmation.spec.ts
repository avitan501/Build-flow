import {expect,test} from "@playwright/test";
import {productMatchSnapshot,productMatchConfirmationError,savedProductMatchStatus,lowestSupplierPriceByItem,analyzeQuoteComparison,type QuoteComparisonItemRecord,type QuoteComparisonBidRecord} from "../lib/quote-comparison";
import {buildProductQuotePreview} from "../lib/product-quote-preview";
import {productChoiceFingerprint} from "../lib/product-choice-draft";
const item={id:"item",description:"Control valve",specification:"4 in threaded",quantity:2,unit:"each"} as QuoteComparisonItemRecord;
const bid={id:"bid",supplier_id:"supplier",supplier_name_snapshot:"Supplier",status:"received",trust_level_snapshot:"verified",delivery_charge:0,tax_percent:0,lead_time_days:1,quote_comparison_prices:[{item_id:"item",bid_id:"bid",unit_price:12,is_available:true,notes:"MFR V400 four inch threaded valve"}]} as QuoteComparisonBidRecord;
function reviewed(){const copy=structuredClone(bid),price=copy.quote_comparison_prices![0];price.quote_product_match_confirmations=[{id:"confirmation",actor_id:"actor",actor_label:"Carlos",created_at:"2026-09-14",source_fingerprint:"a".repeat(64),source_snapshot:productMatchSnapshot(item,copy,price),selling_unit:"each"}];return copy;}
test("different wording needs explicit current source review and preserves supplier text",()=>{
 expect(buildProductQuotePreview([item],[bid]).selectedCount).toBe(0);
 expect(lowestSupplierPriceByItem([item],[bid]).size).toBe(0);
 expect(analyzeQuoteComparison([item],[bid])[0].eligible).toBe(false);
 const confirmed=reviewed();expect(savedProductMatchStatus(item,confirmed,confirmed.quote_comparison_prices![0])).toBe("reviewed");
 expect(buildProductQuotePreview([item],[confirmed],{item:"bid"}).selectedCount).toBe(1);
 expect(lowestSupplierPriceByItem([item],[confirmed]).size).toBe(1);
 expect(analyzeQuoteComparison([item],[confirmed])[0].eligible).toBe(true);
 expect(confirmed.quote_comparison_prices![0].notes).toBe(bid.quote_comparison_prices![0].notes);
});
test("price/spec/unit/source/supplier changes invalidate old confirmation, workflow award alone does not",()=>{
 const confirmed=reviewed();
 for(const changed of [{...item,unit:"box"},{...item,quantity:3},{...item,specification:"3 in"}]) expect(buildProductQuotePreview([changed],[confirmed]).comparableCount).toBe(0);
 for(const patch of [{unit_price:13},{notes:"Different wording"},{is_available:false}]) expect(buildProductQuotePreview([item],[{...confirmed,quote_comparison_prices:[{...confirmed.quote_comparison_prices![0],...patch}]}]).comparableCount).toBe(0);
 expect(buildProductQuotePreview([item],[{...confirmed,supplier_id:"other"}]).comparableCount).toBe(0);
 expect(buildProductQuotePreview([item],[{...confirmed,status:"awarded"}]).comparableCount).toBe(1);
 expect(buildProductQuotePreview([item],[{...confirmed,status:"declined"}]).comparableCount).toBe(0);
});
test("human review cannot manufacture source, convert package units or ignore unavailable",()=>{
 for(const notes of ["","Source per box of 10","Source not available"]) expect(productMatchConfirmationError(item,bid,{...bid.quote_comparison_prices![0],notes},"each")).not.toBeNull();
 expect(productMatchConfirmationError(item,bid,bid.quote_comparison_prices![0],"box")).not.toBeNull();
 expect(productMatchConfirmationError(item,bid,bid.quote_comparison_prices![0],"each")).toBeNull();
});
test("confirmation removal invalidates stored product-choice source fingerprint",async()=>{
 expect(await productChoiceFingerprint([item],[reviewed()])).not.toBe(await productChoiceFingerprint([item],[bid]));
});

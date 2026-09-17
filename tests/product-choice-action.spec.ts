import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as helpers from "../lib/product-choice-draft";
import * as matrixHelpers from '../lib/matrix-choice-draft';
import type { saveProductChoicesAction } from "../app/admin/quote-comparison/product-choice-actions";
import type { QuoteComparisonItemRecord, QuoteComparisonBidRecord } from "../lib/quote-comparison";

const comparisonId="11111111-1111-4111-8111-111111111111";
const item={id:"item",description:"Valve",specification:"",quantity:1,unit:"each"} as QuoteComparisonItemRecord;
const bid={id:"bid",supplier_id:"supplier",supplier_name_snapshot:"Supplier",status:"received",trust_level_snapshot:"verified",quote_comparison_prices:[{bid_id:"bid",item_id:"item",unit_price:12,is_available:true,notes:"Valve"}]} as QuoteComparisonBidRecord;
const compiled=ts.transpileModule(readFileSync("app/admin/quote-comparison/product-choice-actions.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

function actionHarness(options:{status?:string;revision?:number;race?:boolean;deny?:boolean;bid?:QuoteComparisonBidRecord}={}) {
  let writes=0;
  let revision=options.revision??0;
  let snapshot:unknown=null;
  const supabase={from(table:string){
    let update:Record<string,unknown>|null=null;
    const filters=new Map<string,unknown>();
    const query={
      select(){return query},order(){return query},eq(field:string,value:unknown){filters.set(field,value);return query},in(field:string,value:unknown){filters.set(field,value);return query},
      update(value:Record<string,unknown>){update=value;return query},
      async returns(){return {data:table==="quote_comparison_items"?[item]:[options.bid??bid],error:null}},
      async maybeSingle(){
        if(!update)return {data:{status:options.status??"review",product_choice_draft_revision:revision},error:null};
        if(options.race)revision++;
        if(filters.get("product_choice_draft_revision")!==revision)return {data:null,error:null};
        expect(filters.get("id")).toBe(comparisonId);
        expect(filters.get("status")).toEqual(["draft","review"]);
        writes++;snapshot=update.product_choice_draft;revision=Number(update.product_choice_draft_revision);
        return {data:{product_choice_draft_revision:revision},error:null};
      },
    };return query;
  }};
  const exported={} as {saveProductChoicesAction:typeof saveProductChoicesAction};
  new Function("exports","require",compiled)(exported,(id:string)=>{
    if(id==="@/lib/product-choice-draft")return helpers;
    if(id==='@/lib/matrix-choice-draft')return matrixHelpers;
    if(id==='@/lib/matrix-choice-server')return {loadMatrixChoiceSource:async()=>({items:[item],quotes:[{id:'quote',supplierName:'Supplier',fileName:'source.pdf',sourceItems:[]}]})};
    if(id==="@/lib/product-match-server")return {loadProductMatchConfirmations:async(_client:unknown,rows:QuoteComparisonBidRecord[])=>rows};
    if(id==="@/lib/auth")return {requireStaffProfile:async(capability:string)=>{expect(capability).toBe("suppliers");if(options.deny)throw new Error("Unauthorized");return {supabase}}};
    throw new Error(`Unexpected runtime dependency ${id}`);
  });
  return {action:exported.saveProductChoicesAction,state:()=>({writes,revision,snapshot})};
}
async function payload(){return {comparisonId,expectedRevision:0,sourceFingerprint:await helpers.productChoiceFingerprint([item],[bid]),snapshot:{version:1,selections:{item:"bid"}}};}

test('unreviewed purchasing intentions persist separately and reject foreign or stale source quotes',async()=>{
 const fingerprint=await matrixHelpers.matrixChoiceFingerprint([item],[{id:'quote',supplierName:'Supplier',fileName:'source.pdf',sourceItems:[]}]);
 const matrix={baselineQuoteId:'quote',selections:{item:'quote'},sourceFingerprint:fingerprint};
 const success=actionHarness();
 expect(await success.action({...await payload(),snapshot:{version:1,selections:{},matrix}})).toEqual({ok:true,revision:1});
 expect(success.state().snapshot).toEqual({version:1,selections:{},matrix});
 for(const changed of [{...matrix,baselineQuoteId:'foreign'},{...matrix,selections:{other:'quote'}},{...matrix,sourceFingerprint:'a'.repeat(64)}]){
  const blocked=actionHarness();
  expect(await blocked.action({...await payload(),snapshot:{version:1,selections:{},matrix:changed}})).toMatchObject({ok:false,conflict:true});
  expect(blocked.state().writes).toBe(0);
 }
});

test("action saves only eligible current choices and returns acknowledged revision",async()=>{
  const harness=actionHarness();
  expect(await harness.action(await payload())).toEqual({ok:true,revision:1});
  expect(harness.state()).toMatchObject({writes:1,snapshot:{version:1,selections:{item:"bid"}}});
});
test("action refuses stale reads and write-time CAS races",async()=>{
  for(const options of [{revision:1},{race:true}]){
    const harness=actionHarness(options);
    expect(await harness.action(await payload())).toMatchObject({ok:false,conflict:true});
    expect(harness.state().writes).toBe(0);
  }
});
test("locked comparison, foreign choice and altered evidence produce no writes",async()=>{
  const locked=actionHarness({status:"awarded"});expect(await locked.action(await payload())).toMatchObject({ok:false,conflict:true});expect(locked.state().writes).toBe(0);
  const foreign=actionHarness();expect(await foreign.action({...await payload(),snapshot:{version:1,selections:{other:"bid"}}})).toMatchObject({ok:false,conflict:true});expect(foreign.state().writes).toBe(0);
  const changed=actionHarness();expect(await changed.action({...await payload(),sourceFingerprint:"a".repeat(64)})).toMatchObject({ok:false,conflict:true});expect(changed.state().writes).toBe(0);
});
test("authentication denial never reaches draft persistence",async()=>{
  const denied=actionHarness({deny:true});await expect(denied.action(await payload())).rejects.toThrow("Unauthorized");expect(denied.state().writes).toBe(0);
});

test("missing or contradictory source cannot be persisted even with its current fingerprint",async()=>{
  for(const notes of ["", "Valve not available; substitute", "Valve per box of 10"]){
    const unsafeBid={...bid,quote_comparison_prices:[{...bid.quote_comparison_prices![0],notes}]};
    const harness=actionHarness({bid:unsafeBid});
    const input={...await payload(),sourceFingerprint:await helpers.productChoiceFingerprint([item],[unsafeBid])};
    expect(await harness.action(input)).toMatchObject({ok:false,conflict:true});
    expect(harness.state().writes).toBe(0);
  }
});

test("legacy supplier award does not bypass source review for blank wording",()=>{
  const source=readFileSync("app/admin/quote-comparison/actions.ts","utf8");
  const guard=source.slice(source.indexOf("const weakMatch ="),source.indexOf("if (weakMatch)"));
  expect(guard).toContain('return !["exact","reviewed"].includes(matchStatus)');
  expect(guard).not.toContain("return sourceDescription &&");
});

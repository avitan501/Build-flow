import { strict as assert } from "node:assert";
import { claimedQuoteText, deliverClaimedClientQuote, type ClaimedQuoteEmail, type ClaimedRoute, type DeliveryDependencies } from "./claimed-client-quote.ts";
const comparisonId="11111111-1111-4111-8111-111111111111", routeId="22222222-2222-4222-8222-222222222222", actorId="33333333-3333-4333-8333-333333333333", token="44444444-4444-4444-8444-444444444444";
async function fixture() {
  const content=btoa("%PDF-1.7\nQA quote\n%%EOF"), bytes=Uint8Array.from(atob(content), c=>c.charCodeAt(0));
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)), b=>b.toString(16).padStart(2,"0")).join("");
  const snapshot={comparison:{active_route_id:routeId,client_id:actorId,client_quote_status:"ready",client_email_snapshot:"qa@example.invalid",client_name_snapshot:"QA Client",quote_number:"QA-001",job_address:"QA site",client_message:"<script>not HTML</script>",client_delivery_charge:5,client_tax_percent:8.875},items:[{id:"55555555-5555-4555-8555-555555555555",description:"Valve A",specification:"1 inch",quantity:2,unit:"each",client_unit_price:12.345},{id:"66666666-6666-4666-8666-666666666666",description:"Valve B",specification:"2 inch",quantity:3,unit:"each",client_unit_price:20}]};
  const claim:ClaimedRoute={id:routeId,comparison_id:comparisonId,client_send_token:token,client_send_actor_id:actorId,client_send_started_at:"2026-09-14T00:00:00Z",client_send_snapshot:snapshot,client_send_manifest:[{filename:"QA-001.pdf",bytes:bytes.length,sha256}]};
  const payload={action:"send_client_quote",requestId:comparisonId,routeId,deliveryId:token,attachment:{filename:"QA-001.pdf",content}};
  let started=false,providerId="",sendCount=0,startCount=0;
  let email:ClaimedQuoteEmail|undefined,key="";
  const deps:DeliveryDependencies={loadClaim:async()=>claim,start:async()=>{startCount++;if(providerId)return{status:"sent",providerId};if(started)return{status:"ambiguous"};started=true;return{status:"claimed"}},finish:async(_scope,id)=>{providerId=id;return true},send:async(value,idempotency)=>{sendCount++;email=value;key=idempotency;return"provider-fixture"}};
  return{claim,payload,deps,snapshot,get sends(){return sendCount},get starts(){return startCount},get email(){return email},get key(){return key}};
}
Deno.test("mixed snapshot derives exact client lines and rounded totals, not supplier costs",async()=>{
  const f=await fixture(),r=await deliverClaimedClientQuote(f.payload,actorId,f.deps);
  assert.equal(r.status,200);assert.equal(f.sends,1);assert.deepEqual(f.email?.to,["qa@example.invalid"]);
  assert.match(f.email!.text,/Valve A/);assert.match(f.email!.text,/Valve B/);assert.match(f.email!.text,/Materials: \$84.69/);assert.match(f.email!.text,/Total: \$97.65/);
  assert.equal(f.email!.html.includes("<script>"),false);assert.match(f.key,new RegExp(token));
});
Deno.test("repeat and parallel attempts dispatch at most once with durable outcome",async()=>{
  const f=await fixture();const results=await Promise.all([deliverClaimedClientQuote(f.payload,actorId,f.deps),deliverClaimedClientQuote(f.payload,actorId,f.deps)]);
  assert.equal(f.sends,1);assert(results.some(r=>r.status===200));
  const again=await deliverClaimedClientQuote(f.payload,actorId,f.deps);assert.equal(again.body.providerId,"provider-fixture");assert.equal(f.sends,1);
});
Deno.test("ambiguous timeout never retries provider even after a later function call",async()=>{
  const f=await fixture();let calls=0;f.deps.send=async()=>{calls++;throw Error("timeout")};
  assert.equal((await deliverClaimedClientQuote(f.payload,actorId,f.deps)).status,502);
  assert.equal((await deliverClaimedClientQuote(f.payload,actorId,f.deps)).status,409);assert.equal(calls,1);
});
Deno.test("provider confirmation persistence failure remains ambiguous",async()=>{
  const f=await fixture();f.deps.finish=async()=>false;
  assert.equal((await deliverClaimedClientQuote(f.payload,actorId,f.deps)).status,502);
  assert.equal((await deliverClaimedClientQuote(f.payload,actorId,f.deps)).status,409);assert.equal(f.sends,1);
});
for(const kind of ["actor","token","route","comparison","extra recipient","extra body","pdf hash","filename","size","missing manifest","wrong active route","missing client price","empty lines","invalid recipient"]){
  Deno.test(`reject ${kind} before dispatch`,async()=>{
    const f=await fixture();let actor=actorId;
    if(kind==="actor")actor=token;
    if(kind==="token")f.payload.deliveryId=actorId;
    if(kind==="route")f.payload.routeId=actorId;
    if(kind==="comparison")f.payload.requestId=actorId;
    if(kind==="extra recipient")Object.assign(f.payload,{recipientEmail:"elsewhere@example.invalid"});
    if(kind==="extra body")Object.assign(f.payload,{message:"arbitrary"});
    if(kind==="pdf hash")f.payload.attachment.content=btoa("%PDF-1.7\nWRONG!!!\n%%EOF");
    if(kind==="filename")f.payload.attachment.filename="other.pdf";
    if(kind==="size")(f.claim.client_send_manifest as Array<{bytes:number}>)[0].bytes++;
    if(kind==="missing manifest")f.claim.client_send_manifest=null;
    if(kind==="wrong active route")f.snapshot.comparison.active_route_id=actorId;
    if(kind==="missing client price")Object.assign(f.snapshot.items[0],{client_unit_price:null});
    if(kind==="empty lines")f.snapshot.items=[];
    if(kind==="invalid recipient")f.snapshot.comparison.client_email_snapshot="a@example.com,b@example.com";
    assert.equal((await deliverClaimedClientQuote(f.payload,actor,f.deps)).status,400);assert.equal(f.sends,0);assert.equal(f.starts,0);
  });
}
Deno.test("attachment extras and non-PDF first bytes are rejected",async()=>{
  const f=await fixture();assert.equal((await deliverClaimedClientQuote({...f.payload,attachments:[f.payload.attachment]},actorId,f.deps)).status,400);
  f.payload.attachment.content=btoa("NOT-A-PDF");assert.equal((await deliverClaimedClientQuote(f.payload,actorId,f.deps)).status,400);assert.equal(f.starts,0);
});
Deno.test("snapshot totals reject non-finite, negative, zero quantity and duplicate items",async()=>{
  for(const value of [NaN,Infinity,-1]){const f=await fixture();f.snapshot.items[0].client_unit_price=value;assert.throws(()=>claimedQuoteText(f.snapshot,routeId));}
  const f=await fixture();f.snapshot.items[0].quantity=0;assert.throws(()=>claimedQuoteText(f.snapshot,routeId));
  f.snapshot.items[0].quantity=1;f.snapshot.items.push(f.snapshot.items[0]);assert.throws(()=>claimedQuoteText(f.snapshot,routeId));
});
Deno.test("ordered supplemental attachment bytes must match the immutable manifest",async()=>{
  const f=await fixture(), bytes=new TextEncoder().encode("Approved spec sheet");
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
  (f.claim.client_send_manifest as unknown[]).push({filename:"spec.txt",bytes:bytes.length,sha256});
  const payload={...f.payload,attachments:[{filename:"spec.txt",content:btoa("Approved spec sheet")}]};
  assert.equal((await deliverClaimedClientQuote(payload,actorId,f.deps)).status,200);assert.equal(f.email?.attachments.length,2);
  payload.attachments[0].content=btoa("Altered specs sheet");
  assert.equal((await deliverClaimedClientQuote(payload,actorId,f.deps)).status,400);assert.equal(f.sends,1);
});
Deno.test("hash-correct non-PDF artifact still cannot replace the quote PDF",async()=>{
  const f=await fixture(), content="<!doctype html>not a quote", bytes=new TextEncoder().encode(content);
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
  f.claim.client_send_manifest=[{filename:"QA-001.pdf",bytes:bytes.length,sha256}];f.payload.attachment.content=btoa(content);
  assert.equal((await deliverClaimedClientQuote(f.payload,actorId,f.deps)).status,400);assert.equal(f.starts,0);
});

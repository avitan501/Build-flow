import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, imports) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require: name => name in imports ? imports[name] : require(name), Response, Request, Buffer, URL, Date });
  return exports;
}
const seed=JSON.parse(fs.readFileSync('lib/service-planner/seed.json','utf8'));
const schema=load('lib/service-planner/schema.ts', {});
test('API fails closed for nonowners and cross-origin writes; validates inputs and conflicts',async()=>{
  let owner=false,calls=0,conflict=false;
  const api=load('app/api/owner/service-planner/route.ts',{
    '@/lib/owner-access': { getOwnerAccessSession:async()=>({isOwner:owner,user:owner?{id:'owner-id'}:null}) },
    '@/lib/service-planner/schema':schema,
    '@/lib/service-planner/store':{loadPlanner:async()=>{calls++;return {revision:1,state:seed};},savePlanner:async()=>{calls++;return conflict?null:{revision:2,updated_at:'now'};}}
  });
  const request=(body={revision:1,state:seed},origin='https://avantiabuild.com')=>new Request('https://avantiabuild.com/api/owner/service-planner',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await api.GET()).status,403);
  assert.equal((await api.PUT(request())).status,403);assert.equal(calls,0);
  owner=true;
  assert.equal((await api.PUT(request(undefined,'https://other.test'))).status,403);assert.equal(calls,0);
  assert.equal((await api.PUT(request({revision:1,state:{...seed,fees:['bad']}}))).status,400);
  assert.equal((await api.PUT(request({revision:1,state:{...seed,extra:'x'.repeat(65000)}}))).status,413);
  assert.equal((await api.PUT(request())).status,200);
  conflict=true;assert.equal((await api.PUT(request())).status,409);
  const read=await api.GET();assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'private, no-store');
});

test('store checks revision atomically and retains previous versions',async()=>{
  let saved=null,forceRace=false;
  const db={from:()=>{
    let operation='read',value,filters={};
    const query={select(){return query;},eq(k,v){filters[k]=v;return query;},insert(v){operation='insert';value=v;return query;},update(v){operation='update';value=v;return query;},async maybeSingle(){
      if(operation==='read')return {data:saved,error:null};
      if(operation==='insert'&&saved)return {data:null,error:{code:'23505'}};
      if(operation==='update'&&(forceRace||filters.revision!==saved.revision))return {data:null,error:null};
      saved=structuredClone(value);return {data:saved,error:null};
    }};return query;
  }};
  const store=load('lib/service-planner/store.ts',{'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>db},'./seed.json':seed,'./schema':schema});
  const initial=await store.loadPlanner();assert.equal(initial.revision,0);
  const first=await store.savePlanner(0,seed,'owner');assert.equal(first.revision,1);assert.equal(first.history.length,1);
  assert.equal(await store.savePlanner(0,seed,'owner'),null);
  forceRace=true;assert.equal(await store.savePlanner(1,seed,'owner'),null);assert.equal(saved.revision,1);
  forceRace=false;const second=await store.savePlanner(1,{...seed,fees:['$50','','','','','','']},'owner');assert.equal(second.history[0].state.fees[0],'');assert.equal(second.state.fees[0],'$50');
});

test('page rejects access before reading storage and safely embeds text',async()=>{
  let allowed=false,loads=0;
  const page=load('app/owner/service-planner/route.ts',{'@/lib/owner-access':{requireOwnerAccess:async()=>{if(!allowed)throw new Error('redirect');}},'@/lib/service-planner/store':{loadPlanner:async()=>{loads++;return {revision:0,state:{...seed,fees:['</script><script>alert(1)</script>','','','','','','']}};}},'@/lib/service-planner/editor.generated.json':'<div>editor</div>','@/lib/service-planner/runtime.generated.json':''});
  await assert.rejects(page.GET());assert.equal(loads,0);allowed=true;
  const response=await page.GET(),html=await response.text();assert.equal(response.status,200);assert.ok(!html.includes('</script><script>alert(1)'));assert.ok(html.includes('\\u003c/script>'));assert.equal(response.headers.get('cache-control'),'private, no-store');
});

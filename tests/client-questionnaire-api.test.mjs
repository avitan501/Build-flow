import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
function load(file,imports={}){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:n=>n in imports?imports[n]:require(n),Response,Request,Buffer,URL,Date,process,Error});return exports}
const questions=JSON.parse(fs.readFileSync('lib/client-questionnaire/questions.json'));
const schema=load('lib/client-questionnaire/schema.ts',{'./questions.json':questions});
const http=load('lib/client-questionnaire/http.ts');
const id='a76528fe-6c59-473e-a93e-33d5fc20e847';
const state=()=>({type:'avantia-client-questionnaire-v1',profile:{name:'Sample Builder',company:'Example GC',email:'sample@example.com',phone:''},answers:{recent_order:'Lumber for framing',friction:'Late delivery',priorities:'Track deliveries',next_step:'Roof order next week'},consent:true});
const request=(body,headers={})=>new Request('https://example.com/api/client-questionnaire',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('schema accepts client answers, rejects private interviewer fields, unknown questions, missing essentials and oversized data',()=>{
 assert.equal(schema.submissionSchema.safeParse({id,state:state(),website:''}).success,true);
 for(const bad of [{...state(),plan:{internalNotes:'private'}},{...state(),consent:false},{...state(),answers:{...state().answers,unknown:'x'}},{...state(),answers:{}},{...state(),profile:{...state().profile,email:'',phone:''}},{...state(),answers:{...state().answers,projects:'x'.repeat(2501)}}])assert.equal(schema.responseSchema.safeParse(bad).success,false);
});
test('public endpoint validates origin, size, honeypot and schema before storage; does not expose submitted answers',async()=>{
 let calls=0,result='saved';const api=load('app/api/client-questionnaire/route.ts',{'@/lib/client-questionnaire/schema':schema,'@/lib/client-questionnaire/http':http,'@/lib/client-questionnaire/store':{submitResponse:async()=>{calls++;return result}}});
 const body={id,state:state(),website:''};
 assert.equal((await api.POST(request(body,{origin:'https://evil.example'}))).status,403);
 assert.equal((await api.POST(request(body,{'content-type':'text/plain'}))).status,415);
 assert.equal((await api.POST(request({...body,website:'bot'}))).status,400);
 assert.equal((await api.POST(request({...body,extra:'x'}))).status,400);
 assert.equal((await api.POST(request({x:'x'.repeat(100001)}))).status,413);assert.equal(calls,0);
 for(const [kind,status]of [['saved',200],['duplicate',200],['conflict',409],['limited',429],['unknown',503]]){result=kind;const response=await api.POST(request(body));assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.ok(!(await response.text()).includes('Sample Builder'));}
});
test('storage outages preserve retry response rather than claiming success',async()=>{
 const api=load('app/api/client-questionnaire/route.ts',{'@/lib/client-questionnaire/schema':schema,'@/lib/client-questionnaire/http':http,'@/lib/client-questionnaire/store':{submitResponse:async()=>{throw Error('private secret details')}}});
 const response=await api.POST(request({id,state:state(),website:''}));assert.equal(response.status,503);assert.ok(!(await response.text()).includes('secret'));
});
test('owner inbox rejects non-owners before any storage read and validates ids/pagination',async()=>{
 let owner=false,calls=0;const api=load('app/api/owner/service-planner/client-responses/route.ts',{'@/lib/owner-access':{getOwnerAccessSession:async()=>({isOwner:owner,user:{id:'owner'}})},'@/lib/client-questionnaire/http':http,'@/lib/client-questionnaire/store':{listResponses:async()=>{calls++;return []},loadResponse:async()=>{calls++;return null}}});
 const get=query=>api.GET(new Request('https://example.com/api/owner/service-planner/client-responses'+query));
 assert.equal((await get('')).status,403);assert.equal(calls,0);owner=true;
 assert.equal((await get('?id=invalid')).status,400);assert.equal((await get('?offset=-1')).status,400);assert.equal(calls,0);
 assert.equal((await get('')).status,200);assert.equal((await get('?id='+id)).status,404);
});
test('public HTML has nonce CSP and no internal interview state; owner HTML remains access guarded',async()=>{
 const page=load('lib/client-questionnaire/page.ts',{'./questions.json':questions,'./styles.css.json':'body{}','./http':http});
 const response=page.questionnairePage('<script>test()</script>','Test');const html=await response.text();assert.match(response.headers.get('content-security-policy'),/script-src 'nonce-/);assert.ok(!html.includes('internalNotes'));assert.ok(!html.includes('<script>'));
 let calls=0;const owner=load('app/owner/service-planner/client-responses/route.ts',{'@/lib/owner-access':{requireOwnerAccess:async()=>{throw Error('redirect')}},'@/lib/client-questionnaire/inbox.html.json':'test','@/lib/client-questionnaire/page':{questionnairePage:()=>{calls++}}});await assert.rejects(owner.GET());assert.equal(calls,0);
});
test('generated browser assets exactly match reviewable HTML/CSS sources',()=>{for(const file of ['form.html','inbox.html','styles.css'])assert.equal(JSON.parse(fs.readFileSync('lib/client-questionnaire/'+file+'.json')),fs.readFileSync('lib/client-questionnaire/'+file,'utf8'))});
test('submission store uses only the Vercel client header and stores a daily pseudonymous bucket, never a raw address',async()=>{
 const oldKey=process.env.SUPABASE_SECRET_KEY,oldVercel=process.env.VERCEL;process.env.SUPABASE_SECRET_KEY='synthetic-test-key';process.env.VERCEL='1';
 try{const calls=[];const store=load('lib/client-questionnaire/store.ts',{'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>({rpc:async(name,params)=>{calls.push({name,params});return {data:'saved',error:null}}})}});
 await store.submitResponse(id,state(),new Request('https://example.com',{headers:{'x-vercel-forwarded-for':'192.0.2.10','x-forwarded-for':'198.51.100.20'}}));
 await store.submitResponse(id,state(),new Request('https://example.com',{headers:{'x-vercel-forwarded-for':'192.0.2.10','x-forwarded-for':'203.0.113.30'}}));
 assert.equal(calls[0].name,'submit_client_questionnaire');assert.equal(calls[0].params.p_bucket,calls[1].params.p_bucket);assert.match(calls[0].params.p_bucket,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(calls).includes('192.0.2.10'));assert.ok(!JSON.stringify(calls).includes('synthetic-test-key'));
 }finally{if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;if(oldVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=oldVercel}
});

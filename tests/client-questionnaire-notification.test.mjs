import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const id='a76528fe-6c59-473e-a93e-33d5fc20e847';
function load(file,imports={},globals={}){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:n=>n in imports?imports[n]:require(n),Response,Request,Buffer,URL,Date,Error,AbortSignal,console:{error:()=>{}},...globals});return exports;}
const config={SUPABASE_SERVICE_ROLE_KEY:'synthetic-server',SUPABASE_URL:'https://db.example',RESEND_API_KEY:'synthetic-provider',QUOTE_SUBMISSION_FROM:'Avantia <office@example.com>'};
const env={get:name=>config[name]};
const req=(body={id},key='synthetic-server')=>new Request('https://edge.example',{method:'POST',headers:{authorization:`Bearer ${key}`},body:JSON.stringify(body)});
const record={id,created_at:new Date().toISOString(),state:{profile:{name:'<img src=x onerror=alert(1)>',company:'A & B',email:'client@example.com',phone:'555-0100'}}};

test('notification rejects anonymous/user callers and recipient injection before any storage/provider call',async()=>{
 let calls=0;const {handleNotification}=load('supabase/functions/client-questionnaire-notify/handler.ts',{}, {fetch:async()=>{calls++;throw Error()}});
 for(const key of ['', 'anonymous', 'user-token'])assert.equal((await handleNotification(req({id},key),env)).status,403);
 for(const body of [{id,to:'attacker@example.com'},{id:'not-an-id'},null])assert.equal((await handleNotification(req(body),env)).status,400);
 assert.equal(calls,0);
});
test('notification sends only stored contact details to owner; escapes HTML and uses stable deduplication key',async()=>{
 const calls=[];const {handleNotification}=load('supabase/functions/client-questionnaire-notify/handler.ts',{}, {fetch:async(url,options)=>{calls.push({url,options});return Response.json(url.includes('/rest/')?[record]:{id:'provider-id'})}});
 assert.equal((await handleNotification(req(),env)).status,200);
 const mail=JSON.parse(calls[1].options.body);
 assert.deepEqual(mail.to,['avitanneto@gmail.com']);assert.equal(mail.subject,'New client questionnaire — Avantia Build');
 assert.ok(!mail.html.includes('<img'));assert.ok(mail.html.includes('&lt;img'));assert.ok(mail.html.includes('A &amp; B'));
 assert.match(mail.text,/owner\/service-planner\/client-responses/);assert.ok(!mail.text.includes('synthetic-server'));
 assert.equal(calls[1].options.headers['Idempotency-Key'],`client-questionnaire/${id}`);
 assert.equal(mail.from,config.QUOTE_SUBMISSION_FROM);assert.equal(mail.reply_to,undefined);
});
test('missing, old and unreadable records never trigger mail; provider rejection is not success',async()=>{
 for(const [rows,status]of [[[],404],[[{...record,created_at:'2020-01-01'}],409]]){
 let calls=0;const {handleNotification}=load('supabase/functions/client-questionnaire-notify/handler.ts',{}, {fetch:async()=>{calls++;return Response.json(rows)}});
 assert.equal((await handleNotification(req(),env)).status,status);assert.equal(calls,1);
 }
 const {handleNotification}=load('supabase/functions/client-questionnaire-notify/handler.ts',{}, {fetch:async(url)=>url.includes('/rest/')?Response.json([record]):Response.json({message:'private-provider-detail'},{status:500})});
 const response=await handleNotification(req(),env);assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private-provider'));
 assert.equal((await handleNotification(req(),{get:n=>n==='RESEND_API_KEY'?undefined:config[n]})).status,503);
});
test('caller retries transient failures with same receipt and stops on permanent rejection',async()=>{
 for(const [statuses,expected]of [[[503,503,200],3],[[403],1],[[503,503,503],3]]){
 const calls=[];const {notifyOwner}=load('lib/client-questionnaire/notification.ts',{'server-only':{},'node:timers/promises':{setTimeout:async()=>{}}},{process:{env:{NEXT_PUBLIC_SUPABASE_URL:config.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:config.SUPABASE_SERVICE_ROLE_KEY}},fetch:async(url,options)=>{calls.push({url,options});return Response.json({ok:statuses[calls.length-1]===200},{status:statuses[calls.length-1]})}});
 await notifyOwner(id);assert.equal(calls.length,expected);for(const call of calls)assert.deepEqual(JSON.parse(call.options.body),{id});
 }
});
test('saved-only scheduling and notification/scheduling failures preserve successful receipt',async()=>{
 const questions=JSON.parse(fs.readFileSync('lib/client-questionnaire/questions.json'));
 const schema=load('lib/client-questionnaire/schema.ts',{'./questions.json':questions});const http=load('lib/client-questionnaire/http.ts');
 const state={type:'avantia-client-questionnaire-v1',profile:{name:'Test',company:'',email:'test@example.com',phone:''},answers:{priorities:'Track deliveries',next_step:'In stages as my project progresses'},consent:true};
 let stored='saved',scheduled=[],sends=0,failSchedule=false;
 const api=load('app/api/client-questionnaire/route.ts',{'next/server':{after:callback=>{if(failSchedule)throw Error();scheduled.push(callback)}},'@/lib/client-questionnaire/notification':{notifyOwner:async()=>{sends++;throw Error('private')}},'@/lib/client-questionnaire/schema':schema,'@/lib/client-questionnaire/http':http,'@/lib/client-questionnaire/followup':{issueFollowupToken:()=> 'token'},'@/lib/client-questionnaire/store':{submitResponse:async()=>stored}});
 const post=()=>api.POST(new Request('https://example.com/api/client-questionnaire',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify({id,state,website:''})}));
 assert.equal((await post()).status,200);assert.equal(scheduled.length,1);assert.equal(sends,0);await scheduled[0]();assert.equal(sends,1);
 for(const value of ['duplicate','conflict','limited']){stored=value;await post();assert.equal(scheduled.length,1)}
 stored='saved';failSchedule=true;assert.equal((await post()).status,200);
});

test('modern project secret keys authenticate but arbitrary and public keys do not',async()=>{
 let calls=0;const {handleNotification}=load('supabase/functions/client-questionnaire-notify/handler.ts',{}, {fetch:async()=>{calls++;return Response.json([])}});
 const modern={get:n=>n==='SUPABASE_SECRET_KEYS'?JSON.stringify({default:'synthetic-modern-secret'}):config[n]};
 assert.equal((await handleNotification(req({id},'synthetic-modern-secret'),modern)).status,404);assert.equal(calls,1);
 assert.equal((await handleNotification(req({id},'synthetic-public-key'),modern)).status,403);assert.equal(calls,1);
});

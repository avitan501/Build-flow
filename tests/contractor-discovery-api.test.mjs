import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file,imports){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:n=>n in imports?imports[n]:require(n),Response,Request,Buffer,URL,Date});return exports;}
const questions=JSON.parse(fs.readFileSync('lib/contractor-discovery/questions.json','utf8'));
const schema=load('lib/contractor-discovery/schema.ts',{'./questions.json':questions});
const id='a76528fe-6c59-473e-a93e-33d5fc20e847';
const state=()=>({type:'avantia-contractor-discovery-v1',profile:{company:'Example contractor',contact:'',project:'',date:'2026-10-11'},answers:{},departments:[],priorities:[],services:[],plan:{summary:'',responsibility:'',exclusions:'',nextStep:'',successMeasure:'',fee:'',internalNotes:''},status:'draft'});
test('schema bounds answers and avoids arbitrary services; question guide totals 30 minutes',()=>{
 assert.equal(schema.interviewSchema.safeParse(state()).success,true);
 assert.equal(schema.interviewSchema.safeParse({...state(),answers:{unknown:'text'}}).success,false);
 assert.equal(schema.interviewSchema.safeParse({...state(),services:['orders','orders']}).success,false);
 assert.equal(schema.interviewSchema.safeParse({...state(),answers:{projects:'x'.repeat(2501)}}).success,false);
 assert.equal(schema.interviewSchema.safeParse({...state(),profile:{...state().profile,company:' '}}).success,false);
 assert.equal(questions.sections.flatMap(s=>s.questions).length,15);
 assert.equal(questions.sections[5].time,'27–30 min');
 assert.equal(JSON.parse(fs.readFileSync('lib/contractor-discovery/editor.generated.json','utf8')),fs.readFileSync('lib/contractor-discovery/editor.html','utf8'));
});
test('API owner gate, origin, size, validation, pagination, missing record and CAS conflict',async()=>{
 let owner=false,calls=0,conflict=false,fail=false;
 const api=load('app/api/owner/service-planner/interviews/route.ts',{
 '@/lib/owner-access':{getOwnerAccessSession:async()=>({isOwner:owner,user:owner?{id:'owner'}:null})},
 '@/lib/contractor-discovery/schema':schema,
 '@/lib/contractor-discovery/store':{listInterviews:async()=>{calls++;if(fail)throw Error();return [];},loadInterview:async()=>{calls++;return null},saveInterview:async()=>{calls++;if(fail)throw Error();return conflict?null:{id,revision:1,updated_at:'now'}}}});
 const req=(body={id,revision:0,state:state()},origin='https://avantiabuild.com')=>new Request('https://avantiabuild.com/api/owner/service-planner/interviews',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const get=q=>api.GET(new Request('https://avantiabuild.com/api/owner/service-planner/interviews'+q));
 assert.equal((await get('')).status,403);assert.equal((await api.PUT(req())).status,403);assert.equal(calls,0);
 owner=true;assert.equal((await api.PUT(req(undefined,'https://other.test'))).status,403);assert.equal(calls,0);
 assert.equal((await get('?id=avantia-service-planner')).status,400);assert.equal((await get('?offset=-1')).status,400);
 assert.equal((await api.PUT(req({id,revision:0,state:{...state(),junk:'x'.repeat(1000001)}}))).status,413);
 assert.equal((await api.PUT(req({id,revision:0,state:{...state(),services:['book']}}))).status,400);
 assert.equal((await api.PUT(req())).status,200);conflict=true;assert.equal((await api.PUT(req())).status,409);
 assert.equal((await get('?id='+id)).status,404);assert.equal((await get('')).headers.get('cache-control'),'private, no-store');
 fail=true;assert.equal((await get('')).status,503);assert.equal((await api.PUT(req())).status,503);
});
test('independent records, atomic revision updates, stale saves and bounded history',async()=>{
 const records=new Map();let forceRace=false;
 const db={from:name=>{assert.equal(name,'owner_contractor_interviews');let op='read',value,filters={};const query={select(){return query},eq(k,v){filters[k]=v;return query},insert(v){op='insert';value=v;return query},update(v){op='update';value=v;return query},async maybeSingle(){const current=records.get(filters.id||value?.id);if(op==='read')return {data:current||null,error:null};if(op==='insert'&&current)return {data:null,error:{code:'23505'}};if(op==='update'&&(forceRace||current?.revision!==filters.revision))return {data:null,error:null};records.set(value.id,structuredClone(value));return {data:structuredClone(value),error:null}}};return query}};
 const store=load('lib/contractor-discovery/store.ts',{'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>db},'./schema':schema});
 assert.equal(await store.loadInterview(id),null);assert.equal((await store.saveInterview(id,0,state(),'owner')).revision,1);
 assert.equal(await store.saveInterview(id,0,state(),'owner'),null);forceRace=true;assert.equal(await store.saveInterview(id,1,state(),'owner'),null);forceRace=false;
 const other='dd6d03f9-7737-42a2-a921-c85a1df11870';await store.saveInterview(other,0,{...state(),profile:{...state().profile,company:'Other GC'}},'owner');
 for(let i=1;i<24;i++)await store.saveInterview(id,i,{...state(),answers:{projects:'Version '+i}},'owner');
 assert.equal(records.get(id).history.length,20);assert.equal((await store.loadInterview(other)).state.profile.company,'Other GC');assert.equal(records.size,2);
});
test('page guards access first and escapes user-controlled planner names',async()=>{
 let owner=false,reads=0;const page=load('app/owner/service-planner/interviews/route.ts',{'@/lib/owner-access':{requireOwnerAccess:async()=>{if(!owner)throw Error('redirect')}},'@/lib/service-planner/store':{loadPlanner:async()=>{reads++;return {state:{rows:[{id:0,department:'</script><script>bad()</script>',items:''}]}}}},'@/lib/contractor-discovery/questions.json':questions,'@/lib/contractor-discovery/editor.generated.json':'<main>Interview</main>'});
 await assert.rejects(page.GET());assert.equal(reads,0);owner=true;const response=await page.GET();assert.equal(response.status,200);assert.ok(!(await response.text()).includes('</script><script>bad()'));assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
});

test('question bank accepts legacy records, bounds new notes and validates asked question IDs',()=>{
 const bank=questions.sections.flatMap(s=>s.bank);
 assert.equal(bank.length,60);assert.equal(new Set(bank.map(q=>q.id)).size,60);
 assert.ok(bank.every(q=>q.followups.length===2));
 assert.equal(schema.interviewSchema.safeParse(state()).success,true);
 const extended={...state(),bankAnswers:{[bank[0].id]:'Supplier called twice'},askedQuestions:[bank[0].id,'projects']};
 assert.equal(schema.interviewSchema.safeParse(extended).success,true);
 assert.equal(schema.interviewSchema.safeParse({...extended,bankAnswers:{unknown:'note'}}).success,false);
 assert.equal(schema.interviewSchema.safeParse({...extended,askedQuestions:['unknown']}).success,false);
 assert.equal(schema.interviewSchema.safeParse({...extended,askedQuestions:['projects','projects']}).success,false);
 assert.equal(schema.interviewSchema.safeParse({...extended,bankAnswers:{[bank[0].id]:'x'.repeat(2501)}}).success,false);
 const maxState={...state(),bankAnswers:Object.fromEntries(bank.map(q=>[q.id,'😀'.repeat(1250)])),answers:Object.fromEntries(questions.sections.flatMap(s=>s.questions).map(q=>[q.id,'😀'.repeat(1250)]))};
 assert.equal(schema.interviewSchema.safeParse(maxState).success,true);assert.ok(Buffer.byteLength(JSON.stringify(maxState))<1000000);
});

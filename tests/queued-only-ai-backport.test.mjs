import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const helper=readFileSync(new URL('../lib/material-request-organization.ts',import.meta.url),'utf8');
const actions=readFileSync(new URL('../app/owner/materials/requests/actions.ts',import.meta.url),'utf8');
const requestId='00000000-0000-4000-8000-000000000001';
function load(source,imports={},globals={}) {
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,require:name=>{if(!(name in imports))throw Error('Unexpected dependency '+name);return imports[name];},console:{error(){}},...globals});return exports;
}
function scheduler(result,failAfter=false,failWorker=false) {
 const calls=[];const callbacks=[];
 const fn=load(helper,{
  'server-only':{},
  'next/server':{after:cb=>{if(failAfter)throw Error('No after context');callbacks.push(cb);}},
  '@/lib/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return result;}})},
  '@/lib/supabase/admin':{createAdminClient:()=>({functions:{invoke:async name=>{calls.push({name});if(failWorker)throw Error('Worker unavailable');return {data:{ok:true},error:null};}}})},
 }).scheduleClientMaterialListOrganization;
 return {fn,calls,callbacks};
}
test('failed enqueue never schedules provider or worker work',async()=>{
 const s=scheduler({data:null,error:{message:'synthetic'}});
 assert.equal((await s.fn({requestId})).queued,false);assert.equal(s.callbacks.length,0);assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].name,'enqueue_client_material_list_job_for_requester');
});
test('invalid request never calls persistence or provider',async()=>{
 const s=scheduler({});assert.equal((await s.fn({requestId:'invalid'})).status,'invalid');assert.equal(s.calls.length,0);
});
test('successful enqueue returns durable status before bounded worker nudge',async()=>{
 const s=scheduler({data:[{job_status:'processing'}],error:null});
 const result=await s.fn({requestId,force:true});assert.equal(result.queued,true);assert.equal(result.status,'processing');
 assert.equal(s.calls.length,1);assert.equal(s.calls[0].args.p_force,true);await s.callbacks[0]();
 assert.deepEqual(s.calls.map(c=>c.name),['enqueue_client_material_list_job_for_requester','client-material-list-worker']);
});
test('after-context and worker failures do not undo durable enqueue or invoke AI directly',async()=>{
 for(const failAfter of [true,false]) {
 const s=scheduler({data:[{job_status:'queued'}],error:null},failAfter,true);
 assert.equal((await s.fn({requestId})).queued,true);for(const cb of s.callbacks)await cb();
 assert.ok(s.calls.every(c=>c.name!=='client-material-list-ai'));
 }
});
test('actual organize action reports enqueue failure, success remains queued',async()=>{
 const ast=ts.createSourceFile('actions.ts',actions,ts.ScriptTarget.Latest,true);
 const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='organizeClientMaterialRequestAction');assert.ok(node);
 for(const queued of [false,true]) {
 let revalidations=0;
 const fn=load(node.getText(ast),{}, {
 requireStaffProfile:async()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:requestId}})})})})}}),
 scheduleClientMaterialListOrganization:async()=>({queued,status:queued?'queued':'failed'}),
 revalidatePath:()=>revalidations++,
 }).organizeClientMaterialRequestAction;
 const result=await fn({get:key=>key==='requestId'?requestId:null});
 assert.equal(result.ok,queued);assert.equal(revalidations,queued?2:0);
 if(!queued)assert.match(result.error,/original is saved.*could not start/i);
 }
});
test('backport never invokes checkpoint RPCs or direct AI',()=>{
 assert.doesNotMatch(helper,/invokeDirectFallback|"client-material-list-ai"|material_list_checkpoint/);
});

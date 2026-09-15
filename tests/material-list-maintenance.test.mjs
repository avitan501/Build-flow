import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(source,imports={},globals={}) {
 const exports={};const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>{if(!(n in imports))throw Error('Unexpected import '+n);return imports[n]},Response,Request,console:{error(){}},...globals});return exports;
}
const gateSource=read('supabase/functions/_shared/material-list-maintenance.ts');
function gate(mode,override){return load(gateSource.replace('MATERIAL_LIST_DEPLOYMENT_MODE: string = "paused"',`MATERIAL_LIST_DEPLOYMENT_MODE: string = ${JSON.stringify(mode??'paused')}`),{}, {Deno:{env:{get:()=>override}}});}
test('maintenance is fail-closed for absent, invalid and paused mode',async()=>{
 for(const mode of [undefined,'','paused','true','ACTIVE','active ']) assert.equal(gate(mode).materialListProcessingAllowed(),false);
 assert.equal(gate('active').materialListProcessingAllowed(),true);
 assert.equal(gate('paused','active').materialListProcessingAllowed(),false);
 assert.equal(gate('active','paused').materialListProcessingAllowed(),false);
 const response=gate().materialListMaintenanceResponse();assert.equal(response.status,503);assert.equal(response.headers.get('X-Material-List-Gate'),'maintenance-v1');assert.equal((await response.json()).status,'maintenance');
});
for(const kind of ['ai','worker'])test(`actual ${kind} handler pauses before provider, source mutation or job claim`,async()=>{
 const source=read(`supabase/functions/client-material-list-${kind}/index.ts`);
 const ast=ts.createSourceFile('edge.ts',source,ts.ScriptTarget.Latest,true);
 const node=ast.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='Deno.serve');
 assert.ok(node);let work=0;
 const fn=load('export const handler='+node.expression.arguments[0].getText(ast),{}, {
  ...gate('paused'),authorized:async()=>true,json:(b,s=200)=>Response.json(b,{status:s}),
  openAiKey:async()=>{work++;throw Error('Provider lookup must not happen')},
  admin:{rpc:async()=>{work++;throw Error('Claim must not happen')}},
 }).handler;
 const response=await fn(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({action:'drain',requestId:'synthetic'})}));
 assert.equal(response.status,503);assert.equal(work,0);
});
test('public intake never falls back to direct AI; preserves durable queue during maintenance',async()=>{
 const source=read('supabase/functions/_shared/public-material-list-queue.ts');
 for(const scenario of ['http-failed','network-failed','paused','active','nudge-failed']) {
  const calls=[],pending=[];
  const fn=load(source,{'jsr:@supabase/functions-js/edge-runtime.d.ts':{},'./material-list-maintenance.ts':gate(scenario==='active'||scenario==='nudge-failed'?'active':'paused')},{
   fetch:async(url)=>{calls.push(url);if(scenario==='network-failed'||(scenario==='nudge-failed'&&calls.length===2))throw Error('synthetic');return new Response('{}',{status:scenario==='http-failed'?503:200});},
   EdgeRuntime:{waitUntil:p=>pending.push(p)},
  }).queuePublicMaterialList;
  const result=await fn('https://fixture.invalid','synthetic-not-a-key','request-fixture');await Promise.all(pending);
  assert.equal(result.queued,!scenario.endsWith('failed')||scenario==='nudge-failed');
  assert.equal(calls.length,scenario==='active'||scenario==='nudge-failed'?2:1);
  assert.ok(calls.every(url=>!url.includes('/client-material-list-ai')));
  if(scenario==='paused'){assert.equal(result.processingPaused,true);assert.equal(result.status,'queued')}
  if(!result.queued)assert.match(result.message,/original is saved.*could not start/i);
 }
 const intake=read('supabase/functions/public-quote-intake/index.ts');
 assert.doesNotMatch(intake,/functions\/v1\/client-material-list-ai|queueClientMaterialList|functionName = queued/);
 assert.match(intake,/queuePublicMaterialList/);assert.match(intake,/attachmentCount: preparedAttachments.length,\s+organization,/);
});

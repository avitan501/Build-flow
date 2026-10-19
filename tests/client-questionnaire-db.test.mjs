// Run only against the disposable, unexposed test container created in the handoff.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
const enabled=process.env.CLIENT_QUESTIONNAIRE_DB_TEST==='1';
const args=['exec','-i','avantia-client-questionnaire-20261019','psql','-U','postgres','-d',process.env.QUESTIONNAIRE_DATABASE||'questionnaire_revision_test','-At','-v','ON_ERROR_STOP=1'];
const sql=text=>execFileSync('docker',args,{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const run=promisify(execFile);
const state=JSON.stringify({type:'avantia-client-questionnaire-v1',consent:true,profile:{company:'Synthetic only'}});
const call=(id,bucket='a'.repeat(64),hash='b'.repeat(64))=>`set role service_role; select public.submit_client_questionnaire('${id}','${state}'::jsonb,'${hash}','${bucket}');`;
test('private table and RPC deny anon/authenticated; service role cannot update/delete',{skip:!enabled},()=>{
 assert.equal(sql("select relrowsecurity from pg_class where oid='public.client_questionnaire_submissions'::regclass"),'t');
 for(const role of ['anon','authenticated']){
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal(sql(`select has_table_privilege('${role}','public.client_questionnaire_submissions','${privilege}')`),'f');
  assert.equal(sql(`select has_function_privilege('${role}','public.submit_client_questionnaire(uuid,jsonb,text,text)','EXECUTE')`),'f');
  assert.throws(()=>sql(`set role ${role}; select * from public.client_questionnaire_submissions`));
  assert.throws(()=>sql(`set role ${role}; select public.submit_client_questionnaire('${randomUUID()}','${state}','${'a'.repeat(64)}','${'b'.repeat(64)}')`));
 }
 for(const privilege of ['UPDATE','DELETE'])assert.equal(sql(`select has_table_privilege('service_role','public.client_questionnaire_submissions','${privilege}')`),'f');
});
test('retries are idempotent, conflicting retries are rejected, five/day limit is atomic under concurrency',{skip:!enabled},async()=>{
 sql('truncate public.client_questionnaire_followups, public.client_questionnaire_submissions');const id=randomUUID();assert.match(sql(call(id)),/saved$/);assert.match(sql(call(id)),/duplicate$/);assert.match(sql(call(id,undefined,'c'.repeat(64))),/conflict$/);
 const results=await Promise.all(Array.from({length:12},()=>run('docker',[...args,'-c',call(randomUUID())])));
 assert.equal(results.filter(x=>x.stdout.trim().endsWith('saved')).length,4);assert.equal(results.filter(x=>x.stdout.trim().endsWith('limited')).length,8);
 assert.equal(sql('select count(*) from public.client_questionnaire_submissions'),'5');
 assert.match(sql(call(id)),/duplicate$/);assert.match(sql(call(randomUUID(),'d'.repeat(64))),/saved$/);
 sql('truncate public.client_questionnaire_followups, public.client_questionnaire_submissions');
 const same=randomUUID(),retries=await Promise.all(Array.from({length:8},()=>run('docker',[...args,'-c',call(same)])));
 assert.equal(retries.filter(x=>x.stdout.trim().endsWith('saved')).length,1);assert.equal(retries.filter(x=>x.stdout.trim().endsWith('duplicate')).length,7);assert.equal(sql('select count(*) from public.client_questionnaire_submissions'),'1');
});

test('follow-up is private, scoped to existing receipt and leaves original unchanged',{skip:!enabled},()=>{
 assert.equal(sql("select relrowsecurity from pg_class where oid='public.client_questionnaire_followups'::regclass"),'t');
 for(const role of ['anon','authenticated'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal(sql(`select has_table_privilege('${role}','public.client_questionnaire_followups','${privilege}')`),'f');
 assert.equal(sql("select has_table_privilege('service_role','public.client_questionnaire_followups','DELETE')"),'f');
 const id=randomUUID();sql(call(id,'e'.repeat(64)));const before=sql(`select state from public.client_questionnaire_submissions where id='${id}'`);
 sql(`set role service_role; insert into public.client_questionnaire_followups(submission_id,location,timing) values('${id}','Test town','Soon');update public.client_questionnaire_followups set location='Updated town' where submission_id='${id}';`);
 assert.equal(sql(`select count(*) from public.client_questionnaire_followups where submission_id='${id}'`),'1');assert.equal(sql(`select state from public.client_questionnaire_submissions where id='${id}'`),before);
 assert.throws(()=>sql(`set role service_role; insert into public.client_questionnaire_followups(submission_id,location) values('${randomUUID()}','Test')`));
});

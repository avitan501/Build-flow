// LOCAL Docker fixture only. Refuses arbitrary container/database targets.
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
const container='avantia-ai01-sql-20260914'
const database='ai01_final'
function query(sql,onData) {
 return new Promise((resolve,reject)=>{
  const p=spawn('docker',['exec','-i',container,'psql','-d',database,'-h','/tmp','-U','postgres','-At','-v','ON_ERROR_STOP=1'])
  let output='';p.stdout.on('data',d=>{output+=d;onData?.(String(d))});p.stderr.on('data',d=>output+=d)
  p.on('error',reject);p.on('close',code=>resolve({code,output}));p.stdin.end(sql)
 })
}
const role=`set request.jwt.claims='{"role":"service_role"}';`
const request='00000000-0000-0000-0000-000000000021'
const lease='00000000-0000-0000-0000-000000000023'
assert.equal((await query(`${role}
 insert into quote_requests values('${request}');
 insert into quote_request_items(id,request_id,name,quantity) values('00000000-0000-0000-0000-000000000022','${request}','Original before concurrent edit',1);
 insert into client_material_list_jobs(id,request_id,status,generation,ai_chunk_lease) values(2,'${request}','processing',1,'${lease}');
 select material_list_checkpoint(2,1,'${lease}',repeat('c',64),1,0,'{"result":{"items":[]}}');`)).code,0)
let markLocked
const locked=new Promise(resolve=>markLocked=resolve)
const edit=query(`${role} begin;update quote_request_items set name='Concurrent edit preserved' where request_id='${request}';select 'EDIT_LOCKED';select pg_sleep(2);commit;`,text=>{if(text.includes('EDIT_LOCKED'))markLocked()})
await locked
// Publication starts while edit owns the row/job lock, not after edit finishes.
const publication=query(`${role} select publish_material_list_checkpoint(2,1,'${lease}',repeat('c',64),'[]','stale','needs_review');`)
assert.equal((await edit).code,0)
const result=await publication
assert.notEqual(result.code,0)
assert.match(result.output,/stale_job/)
const final=await query(`select name || ':' || coalesce(metadata->>'ai_organization_status','untouched') from quote_request_items where request_id='${request}';`)
assert.match(final.output,/Concurrent edit preserved:untouched/)
console.log('Concurrent edit/late publication: stale worker rejected; user edit and original status preserved.')

import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const name='avantia-alternate-cas-20260915-'+process.pid;
const id=execFileSync('docker',['run','-d','--network','none','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8'}).trim();
const sql=input=>execFileSync('docker',['exec','-i',id,'psql','-h','127.0.0.1','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',fresh='33333333-3333-4333-8333-333333333333';
const session=(who,body)=>`set role authenticated;select set_config('request.jwt.claim.sub','${who}',false);${body}`;
try{
 for(let i=0;i<150;i++){try{sql('select 1');break}catch{await new Promise(r=>setTimeout(r,100))}}
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${actor}','{"alternate_email":"old@example.invalid","alternate_phone":"","full_name":"Keep Name","phone":"Keep Phone","notification_sms":true}'),('${other}','{"alternate_email":false}');create function auth.reject_update()returns trigger language plpgsql as $$begin raise exception 'auth writes forbidden in contacts test';end$$;create trigger reject_update before update on auth.users for each row execute function auth.reject_update();`);
 sql(readFileSync(new URL('../supabase/migrations/20260915044324_account_alternate_contact_cas.sql',import.meta.url),'utf8'));
 assert.equal(sql(`select alternate_email||':'||alternate_phone||':'||revision from public.account_contact_settings where user_id='${actor}'`),'old@example.invalid::0');
 const result=(who,args)=>JSON.parse(sql(session(who,`select public.save_account_contacts(${args});`)).split('\n').at(-1));
 assert.deepEqual(result(actor,`' NEW@EXAMPLE.INVALID ','+15165550199',0`),{ok:true,email:'new@example.invalid',phone:'+15165550199',revision:1});
 assert.equal(result(actor,`'stale@example.invalid',null,0`).ok,false);
 assert.equal(result(actor,`'new@example.invalid','+15165550199',0`).revision,1);
 assert.deepEqual(result(actor,`' ',' ',1`),{ok:true,email:null,phone:null,revision:2});
 assert.equal(sql(session(other,`select count(*) from public.account_contact_settings where user_id='${actor}';`)).split('\n').at(-1),'0');
 function denied(input){let failed=false;try{sql(input)}catch{failed=true}assert.equal(failed,true)}
 denied(session(actor,`update public.account_contact_settings set revision=900 where user_id='${actor}';`));
 denied('set role anon;select * from public.account_contact_settings;');
 denied(`set role service_role;select public.save_account_contacts(null,null,0);`);
 denied(session('',`select public.save_account_contacts(null,null,0);`));
 denied(session(actor,`select public.save_account_contacts('bad',null,2);`));
 denied(session(actor,`select public.save_account_contacts(null,'++15165550100',2);`));
 sql(`insert into auth.users values('${fresh}','{}');`);
 assert.equal(result(fresh,`'new@example.invalid',null,9`).ok,false);
 assert.equal(sql(`select count(*) from public.account_contact_settings where user_id='${fresh}'`),'0');
 // Actual two-session first-create contention: winner commits revision1;
 // waiting stale revision0 cannot overwrite either contact field.
 const a=spawn('docker',['exec','-i',id,'psql','-h','127.0.0.1','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres']);
 let output='';a.stdout.on('data',b=>output+=b);a.stdin.end(session(fresh,`begin;select public.save_account_contacts('winner@example.invalid',null,0);select pg_sleep(0.7);commit;`));
 await new Promise(r=>setTimeout(r,200));
 const loser=result(fresh,`'loser@example.invalid','+15165550199',0`);
 if(a.exitCode===null)await new Promise((resolve,reject)=>{a.on('exit',code=>code===0?resolve():reject(new Error('concurrent session failed'))) });
 assert.match(output,/winner@example.invalid/);assert.equal(loser.ok,false);assert.equal(loser.conflict.email,'winner@example.invalid');assert.equal(loser.conflict.phone,null);
 assert.equal(sql(`select raw_user_meta_data->>'full_name' from auth.users where id='${actor}'`),'Keep Name');
 assert.equal(sql(`select has_function_privilege('anon','public.save_account_contacts(text,text,bigint)','execute') or has_function_privilege('service_role','public.save_account_contacts(text,text,bigint)','execute')`),'f');
 console.log('PASS migration copies only contact fields, auth unchanged, self-RLS/directDML/anon/service denial, normalization/blankclear/CAS/lostack, missing-row badrevision noinsert, two-session first-create contention.');
}finally{execFileSync('docker',['rm','-f',id],{stdio:'ignore'})}

import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const name='avantia-alternate-cas-20260915-'+process.pid;
const id=execFileSync('docker',['run','-d','--network','none','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8'}).trim();
const sql=input=>execFileSync('docker',['exec','-i',id,'psql','-h','127.0.0.1','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',fresh='33333333-3333-4333-8333-333333333333';
const session=(who,body)=>`set role authenticated;select set_config('request.jwt.claim.sub','${who}',false);${body}`;
function concurrent(input) {
 const child=spawn('docker',['exec','-i',id,'psql','-h','127.0.0.1','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres']);let out='',error='';
 child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>error+=b);child.stdin.end(input);
 const done=new Promise(resolve=>child.on('exit',code=>resolve({code,out,error})));
 return {done,wait:async marker=>{for(let i=0;i<150;i++){if(out.includes(marker))return;await new Promise(r=>setTimeout(r,50))}throw new Error('Missing barrier '+marker)}};
}
try{
 for(let i=0;i<150;i++){try{sql('select 1');break}catch{await new Promise(r=>setTimeout(r,100))}}
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${actor}','{"alternate_email":"old@example.invalid","alternate_phone":"","full_name":"Keep Name","phone":"Keep Phone","notification_sms":true}'),('${other}','{"alternate_email":false}');`);
 sql(`create role supabase_auth_admin;grant usage on schema auth to supabase_auth_admin;grant select,update on auth.users to supabase_auth_admin;alter table auth.users add column email text,add column phone text,add column encrypted_password text;`);
 const before=concurrent(`set role supabase_auth_admin;begin;update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{alternate_email}','"before@example.invalid"') where id='${actor}';select 'writer_before';select pg_sleep(0.5);commit;`);
 await before.wait('writer_before');
 const migration=readFileSync(new URL('../supabase/migrations/20260915044324_account_alternate_contact_cas.sql',import.meta.url),'utf8');
 const cutover=concurrent('begin;'+migration.replace('lock table auth.users in share row exclusive mode;',"lock table auth.users in share row exclusive mode;select 'cutover_locked';select pg_sleep(0.5);")+'commit;');
 await cutover.wait('cutover_locked');
 const after=concurrent(`set role supabase_auth_admin;update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{alternate_email}','"after@example.invalid"') where id='${actor}';`);
 const [beforeResult,cutoverResult,afterResult]=await Promise.all([before.done,cutover.done,after.done]);
 assert.equal(beforeResult.code,0);assert.equal(cutoverResult.code,0);assert.notEqual(afterResult.code,0);assert.match(afterResult.error,/Alternate contacts moved/);
 assert.equal(sql(`select alternate_email||':'||alternate_phone||':'||revision from public.account_contact_settings where user_id='${actor}'`),'before@example.invalid::0');
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
 // Auth still updates unrelated fields. Normalized contact no-ops are allowed.
 sql(`set role supabase_auth_admin;update auth.users set raw_user_meta_data=raw_user_meta_data||'{"full_name":"Updated Name","phone":"Updated Phone","notification_email":false,"notification_sms":false,"avatar_url":"https://example.invalid/avatar","provider_id":"oauth-fixture"}',email='login@example.invalid',phone='+15165550100',encrypted_password='fixture-hash' where id='${actor}';update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{alternate_email}','" BEFORE@EXAMPLE.INVALID "') where id='${actor}';`);
 denied(`set role supabase_auth_admin;update auth.users set raw_user_meta_data=raw_user_meta_data||'{"alternate_phone":"+15165550199","notification_email":true}' where id='${actor}';`);
 assert.equal(sql(`select raw_user_meta_data->>'notification_email' from auth.users where id='${actor}'`),'false');
 assert.equal(sql(`select alternate_email is null and alternate_phone is null and revision=2 from public.account_contact_settings where user_id='${actor}'`),'t');
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
 assert.equal(sql(`select raw_user_meta_data->>'full_name' from auth.users where id='${actor}'`),'Updated Name');
 assert.equal(sql(`select has_function_privilege('anon','public.save_account_contacts(text,text,bigint)','execute') or has_function_privilege('service_role','public.save_account_contacts(text,text,bigint)','execute')`),'f');
 console.log('PASS atomic before/after legacy-writer cutover race, old mutation rejected/rollback, unrelated OAuth/preferences/name/phone/password allowed, new CAS remains independent, self-RLS/directDML/anon/service denial, blankclear/lostack, missing-row noinsert, two-session first-create contention.');
}finally{execFileSync('docker',['rm','-f',id],{stdio:'ignore'})}

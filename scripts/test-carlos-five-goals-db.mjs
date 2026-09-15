import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const id=execFileSync('docker',['run','-d','--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8'}).trim();
const sql=q=>execFileSync('docker',['exec','-i',id,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
try {
 for(let n=0;n<30;n++){try{sql('select 1');break}catch{await new Promise(r=>setTimeout(r,300))}}
 sql(`create role authenticated;create role anon;create schema auth;create schema private;grant usage on schema auth,private to authenticated;
 create table auth.users(id uuid,email text);create table public.profiles(id uuid,role text,approval_status text,is_active boolean);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function private.carlos_payroll_actor() returns text language sql stable security definer set search_path='' as $$select case when lower(btrim(u.email))='avitanneto@gmail.com' and p.role='admin' then 'owner' when lower(btrim(u.email))='buildavantiap@gmail.com' and p.role='staff' then 'carlos' end from auth.users u join public.profiles p on p.id=u.id where u.id=auth.uid() and p.approval_status='approved' and p.is_active=true$$;
 insert into auth.users values('00000000-0000-4000-8000-000000000001','buildavantiap@gmail.com'),('00000000-0000-4000-8000-000000000002','avitanneto@gmail.com'),('00000000-0000-4000-8000-000000000003','other@example.invalid');
 insert into public.profiles select id,case when email='avitanneto@gmail.com' then 'admin' else 'staff' end,'approved',true from auth.users;`);
 sql(readFileSync('supabase/migrations/20260915155526_carlos_five_goals.sql','utf8'));
 const as=(n,q)=>`set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000${n}',false);${q}`;
 const call=(revision,goals)=>`select public.save_carlos_five_goals(${revision},'${JSON.stringify(goals).replaceAll("'","''")}'::jsonb)`;
 const goals=Array.from({length:10},(_,id)=>({id,selected:id<5,status:'in_progress',note:'',link:'',count:0}));
 assert.equal(JSON.parse(sql(as(1,'select public.get_carlos_five_goals()')).split('\n').at(-1)).revision,0);
 const save=sql(as(1,call(0,goals)));assert.equal(JSON.parse(save.split('\n').at(-1)).revision,1);
 assert.equal(JSON.parse(sql(as(2,'select public.get_carlos_five_goals()')).split('\n').at(-1)).goals.length,10);
 assert.equal(JSON.parse(sql(as(1,call(0,goals))).split('\n').at(-1)).revision,1);
 const changed=structuredClone(goals);changed[0].note='Real progress';assert.throws(()=>sql(as(2,call(0,changed))),/goals_conflict/);
 const six=structuredClone(goals);six[5].selected=true;assert.throws(()=>sql(as(1,call(1,six))),/five_goal_limit/);
 const done=structuredClone(goals);done[0].status='done';assert.throws(()=>sql(as(1,call(1,done))),/result_required/);
 done[0].note='Five quotes linked';done[0].link='https://example.invalid/request';assert.throws(()=>sql(as(1,call(1,done))),/evidence_required/);
 done[0].count=5;assert.equal(JSON.parse(sql(as(1,call(1,done))).split('\n').at(-1)).revision,2);
 assert.throws(()=>sql(as(3,'select public.get_carlos_five_goals()')),/goals_forbidden/);
 assert.throws(()=>sql(as(1,"update private.carlos_five_goals set revision=99")),/permission denied/);
 assert.throws(()=>sql('set role anon;select public.get_carlos_five_goals()'),/permission denied/);
 sql("update public.profiles set is_active=false where id='00000000-0000-4000-8000-000000000001'");
 assert.throws(()=>sql(as(1,'select public.get_carlos_five_goals()')),/goals_forbidden/);
 console.log('PASS: PostgreSQL17 migration, Carlos/owner read/write, stale-write conflict, retry idempotence, max5, completion evidence, anon/other/disabled deny, direct DML deny');
}finally{execFileSync('docker',['rm','-f',id],{stdio:'ignore'})}

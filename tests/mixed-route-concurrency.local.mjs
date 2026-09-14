// Disposable container only; no credentials or network endpoints accepted.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const container='avantia-mixed-route-final-20260914', database=`mixed_race_${Date.now()}`;
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function sql(text,db=database){const r=spawnSync('docker',['exec','-i',container,'psql','-X','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-At'],{input:text,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim()}
function session(name){const p=spawn('docker',['exec','-i',container,'psql','-X','-U','postgres','-d',database,'-At']);let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);const done=new Promise(resolve=>p.on('close',resolve));p.stdin.write(`set application_name='${name}';set statement_timeout='8s';\n\\set VERBOSITY verbose\n`);return{p,done,write:s=>p.stdin.write(s+'\n'),out:()=>out,err:()=>err}}
async function until(fn,label){const deadline=Date.now()+6000;while(!fn()){assert.ok(Date.now()<deadline,label);await new Promise(r=>setTimeout(r,25))}}
const comp='00000000-0000-4000-8000-000000000010',actor='00000000-0000-4000-8000-000000000001';
const snapshot=`select jsonb_build_object('parent',(select to_jsonb(c) from quote_comparisons c where id='${comp}'),'routes',(select jsonb_agg(to_jsonb(r) order by id) from quote_comparison_routes r),'prices',(select jsonb_agg(to_jsonb(p) order by bid_id,item_id) from quote_comparison_prices p),'items',(select jsonb_agg(to_jsonb(i) order by id) from quote_comparison_items i),'reviews',(select jsonb_agg(to_jsonb(r) order by id) from quote_product_match_confirmations r));`;
sql(`create database ${database};`,'postgres');
try{
 const fixture=file('tests/finalized-route.local.sql').replace('\\i /match/supabase/migrations/20260914225701_trusted_product_match.sql',()=>file('supabase/migrations/20260914225701_trusted_product_match.sql')).replace('\\i /work/supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql',()=>file('supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql'));
 sql(fixture);
 const choices=file('supabase/migrations/20260914191336_product_choice_autosave.sql');
 sql(choices.slice(choices.indexOf('create function public.invalidate_quote_product_choice_draft_revision'),choices.indexOf('-- Parent business details')));
 sql(`update quote_comparisons set active_route_id=null,status='review';`);
 const finalize=`select public.staff_finalize_quote_comparison_route('${comp}','${actor}',5,repeat('a',64),'00000000-0000-4000-8000-000000000077','[]');`;
 for(const [name,call] of [['finalize',finalize],['client-evidence',`select public.lock_finalized_route_evidence('${comp}',(select id from quote_comparison_routes limit 1));`]]){
  const before=sql(snapshot),a=session(`mixed_${name}_parent`),b=session(`mixed_${name}_child`);
  try{
   a.write(`begin;select id from quote_comparisons where id='${comp}' for update;select 'PARENT_HELD';`);
   await until(()=>a.out().includes('PARENT_HELD'),'parent not held');
   b.write(`begin;update quote_comparison_prices set unit_price=unit_price+1;rollback;select 'CHILD_DONE';`);
   await until(()=>sql(`select count(*) from pg_stat_activity where application_name='mixed_${name}_child' and wait_event_type='Lock'`)==='1','price CAS did not wait on parent');
   a.write(`${call} rollback;select 'PARENT_DONE';`);
   await until(()=>a.out().includes('PARENT_DONE')&&b.out().includes('CHILD_DONE'),'race did not finish');
   assert.match(a.err(),/55P03/);assert.doesNotMatch(a.err()+b.err(),/40P01/);assert.equal(sql(snapshot),before);
   console.log(name+': NOWAIT55P03, no deadlock, no source/draft/route partial write');
  }finally{a.p.stdin.end();b.p.stdin.end();await Promise.all([a.done,b.done])}
 }
 assert.match(sql(finalize),/"ok": true/);
 console.log('Explicit uncontended retry finalized the unchanged manual A/B draft');
}finally{sql(`drop database ${database} with (force);`,'postgres')}

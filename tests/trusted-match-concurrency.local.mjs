// Isolated PostgreSQL container only. No production URL or credentials accepted.
// node tests/trusted-match-concurrency.local.mjs [--baseline]
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const container = 'avantia-noam-match-20260914';
const database = `noam_lock_${Date.now()}`;
const baseline = process.argv.includes('--baseline');
const root = new URL('../', import.meta.url);
const file = path => readFileSync(new URL(path, root), 'utf8');
function sql(text, db = database) {
 const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { input: text, encoding: 'utf8' });
 assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
function session(name) {
 const child = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', database, '-At']);
 let out = '', err = '';
 child.stdout.on('data', data => { out += data }); child.stderr.on('data', data => { err += data });
 const done = new Promise(resolve => child.on('close', resolve));
 child.stdin.write(`set application_name='${name}'; set deadlock_timeout='100ms'; set statement_timeout='8s'; \n\\set VERBOSITY verbose\n`);
 return { child, done, write: text => child.stdin.write(text + '\n'), output: () => out, errors: () => err };
}
async function until(predicate, label) {
 const deadline = Date.now() + 6000;
 while (!predicate()) { assert.ok(Date.now() < deadline, label); await new Promise(resolve => setTimeout(resolve, 25)); }
}
const comparison = '00000000-0000-4000-8000-000000000010';
const item = '00000000-0000-4000-8000-000000000011';
const bid = '00000000-0000-4000-8000-000000000012';
const actor = '00000000-0000-4000-8000-000000000001';
const confirm = `select public.staff_confirm_product_match('${comparison}','${item}','${bid}','${actor}',public.test_match_snapshot(),repeat('e',64),'each');`;
const award = `select public.staff_award_reviewed_product_bid('${comparison}','${bid}','${actor}','[]');`;
const snapshot = `select jsonb_build_object('parent',(select to_jsonb(t) from quote_comparisons t where id='${comparison}'),'items',(select jsonb_agg(to_jsonb(t) order by id) from quote_comparison_items t),'bids',(select jsonb_agg(to_jsonb(t) order by id) from quote_comparison_bids t),'prices',(select jsonb_agg(to_jsonb(t) order by item_id,bid_id) from quote_comparison_prices t),'reviews',(select jsonb_agg(to_jsonb(t) order by id) from quote_product_match_confirmations t));`;
sql(`create database ${database};`, 'postgres');
try {
 let migration = file('supabase/migrations/20260914225701_trusted_product_match.sql');
 if (baseline) migration = migration.replaceAll('for update nowait', 'for update');
 sql(file('tests/product-match-confirmation.local.sql').replace('\\i /migration.sql', () => migration));
 // Include the real child CAS invalidation function/triggers omitted by the
 // basic fixture; do not create an artificial stand-in trigger.
 const choices = file('supabase/migrations/20260914191336_product_choice_autosave.sql');
 sql(choices.slice(choices.indexOf('create function public.invalidate_quote_product_choice_draft_revision'), choices.indexOf('-- Parent business details')));
 sql(`update quote_comparisons set request_id=null,status='review',awarded_bid_id=null;
 delete from quote_comparison_items where id='00000000-0000-4000-8000-000000000014';
 alter table quote_comparisons add column product_choice_draft jsonb default '{"version":1,"selections":{}}';
 ${confirm}`);
 for (const [name, call] of [['confirm', confirm], ['award', award]]) {
  const before = sql(snapshot);
  const a = session(`noam_${name}_parent`), b = session(`noam_${name}_child`);
  try {
   a.write(`begin; select id from quote_comparisons where id='${comparison}' for update; select 'PARENT_HELD';`);
   await until(() => a.output().includes('PARENT_HELD'), 'parent was not acquired');
   b.write(`begin; update quote_comparison_prices set unit_price=unit_price+1 where item_id='${item}'; rollback; select 'CHILD_DONE';`);
   await until(() => sql(`select count(*) from pg_stat_activity where application_name='noam_${name}_child' and wait_event_type='Lock'`) === '1', 'child did not reach parent trigger lock');
   const started = Date.now();
   a.write(`${call}\nrollback; select 'PARENT_DONE';`);
   await until(() => a.output().includes('PARENT_DONE') && b.output().includes('CHILD_DONE'), 'sessions did not finish');
   const errors = a.errors() + b.errors();
   assert.match(errors, baseline ? /40P01/ : /55P03/);
   if (!baseline) { assert.doesNotMatch(errors, /40P01/); assert.match(errors, /Nothing was saved; retry/); assert.ok(Date.now() - started < 3000); }
   assert.equal(sql(snapshot), before, 'source, review, award or draft changed after abort/rollback');
   console.log(`${name}: ${baseline ? '40P01 reproduced' : '55P03 safe retry'}; all source/draft/review/award state unchanged`);
  } finally { a.child.stdin.end(); b.child.stdin.end(); await Promise.all([a.done,b.done]); }
 }
 if (!baseline) {
  assert.match(sql(confirm), /true/);
  sql(award);
  assert.equal(sql(`select status||':'||awarded_bid_id from quote_comparisons where id='${comparison}'`), `awarded:${bid}`);
  console.log('Uncontended explicit retry: confirmation and award succeed');
 }
} finally {
 // Only this generated, disposable test database; no other DB is touched.
 sql(`drop database ${database} with (force);`, 'postgres');
}

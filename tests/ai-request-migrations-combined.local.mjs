// Metadata-only production baseline, synthetic records, network-none local PG.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runAiCombined } from './ai-source-publication-locks.local.mjs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const meta = JSON.parse(read('tests/fixtures/request-schema-metadata-20260914.json'));
const indexes = JSON.parse(read('tests/fixtures/request-schema-indexes-20260914.json'));
const grants = JSON.parse(read('tests/fixtures/request-schema-grants-20260914.json'));
const database = `noam_combined_${Date.now()}`;
const container = 'avantia-ai-combined-20260915';
// Capture the optional candidate once; reject a mismatched frozen hash rather
// than accidentally test a moving worktree under a previous version label.
const mixed = process.argv[2] ? readFileSync(process.argv[2],'utf8') : null;
const mixedHash = mixed === null ? null : createHash('sha256').update(mixed).digest('hex');
if(process.argv[3]) assert.equal(mixedHash,process.argv[3],'Mixed candidate changed before rehearsal');
function sql(text, db = database) {
 const result = spawnSync('docker', ['exec','-i',container,'psql','-X','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-At'], {input:text,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr); return result.stdout.trim();
}
const quote = name => '"'+name.replaceAll('"','""')+'"';
const migrations = ['20260914175308_request_workflow_steps.sql','20260914191309_request_item_edit_receipts.sql','20260914191336_product_choice_autosave.sql','20260914225145_request_source_attachment_fence.sql','20260914225701_trusted_product_match.sql'];
assert.equal(spawnSync('docker',['inspect','--format','{{.HostConfig.NetworkMode}}',container],{encoding:'utf8'}).stdout.trim(),'none');
sql(`create database ${database};`,'postgres');
try {
 sql(`do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
 end $$;`);
 sql(`create schema auth; create schema private;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('email',email) from auth.users where id=auth.uid()$$;
 create sequence public.quote_request_public_number_seq start 100000;
 -- Out-of-scope dependency shells: no business data, external services or auth tokens.
 create table public.supplier_quotes(id uuid primary key);
 create table public.material_questionnaire_responses(id uuid primary key);
 create table public.staff_access_grants(email text primary key,active boolean,can_manage_customers boolean,can_manage_suppliers boolean);
 create table public.manager_staff_activity_events(user_id uuid,event_type text,page_path text,page_label text,entity_type text,entity_id text,metadata jsonb);
 create table public.test_push_events(kind text);
 create function public.queue_manager_push_event(text,text,text,text,text,text) returns void language sql as $$insert into public.test_push_events values($1)$$;
 grant usage on schema auth,private to authenticated,service_role;
 grant select on auth.users to service_role;`);
 const tables = [...new Set(meta.columns.map(c=>c.table_name))];
 for(const table of tables) sql(`create table public.${quote(table)} (${meta.columns.filter(c=>c.table_name===table).map(c=>`${quote(c.column_name)} ${c.type}${c.not_null?' not null':''}${c.default_expression?' default '+c.default_expression:''}`).join(',')}); alter table public.${quote(table)} enable row level security;`);
 for(const c of [...meta.constraints.filter(c=>c.kind!=='f'),...meta.constraints.filter(c=>c.kind==='f')]) sql(`alter table public.${quote(c.table_name)} add constraint ${quote(c.name)} ${c.definition};`);
 for(const index of indexes) sql(index.definition+';');
 for(const helper of [...meta.helpers].sort((a,b)=>Number(a.name==='is_admin_or_staff')-Number(b.name==='is_admin_or_staff'))) sql(helper.definition);
 for(const p of meta.policies) {
  const roles=Array.isArray(p.roles)?p.roles:p.roles.replace(/^\{|\}$/g,'').split(',');
  sql(`create policy ${quote(p.name)} on public.${quote(p.table_name)} as ${p.permissive} for ${p.cmd} to ${roles.map(quote).join(',')}${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
 }
 for(const definition of new Set(meta.triggers.map(t=>t.function_definition))) sql(definition);
 for(const t of meta.triggers) sql(t.definition+';');
 for(const fn of JSON.parse(read('tests/fixtures/request-legacy-functions-20260914.json'))) sql(fn.definition);
 sql('grant execute on function public.staff_reopen_quote_comparison(uuid) to authenticated;');
 // Replay captured table grants, then apply pending migration grants/revokes.
 sql(grants.map(g=>`grant ${g.privilege_type} on public.${quote(g.table_name)} to ${quote(g.grantee)};`).join('\n'));
 sql(`grant usage,select on all sequences in schema public to service_role,authenticated;`);
 for(const migration of migrations) { sql('begin;\n'+read('supabase/migrations/'+migration)+'\ncommit;'); console.log('Installed '+migration); }
 // Optional future frozen mixed migration can be rehearsed on this same baseline.
 if(mixed !== null) {
  sql(mixed); console.log('Installed mixed migration SHA256 '+mixedHash);
 }
 sql(read('tests/request-migrations-combined.local.sql'));
 if(process.argv[2]) { sql(read('tests/request-mixed-client-flow.local.sql')); console.log('PASS: mixed A/B allocation, displayed client CAS, claim and bypass guards'); }
 console.log('PASS: combined schema, roles, receipt/source fence, choices and trusted match interactions');
 console.log(sql(`select 'constraints='||count(*) from pg_constraint where connamespace='public'::regnamespace; select 'triggers='||count(*) from pg_trigger where not tgisinternal and tgrelid in(select oid from pg_class where relnamespace='public'::regnamespace);`));
 // Actual durable table/claim/finish implementation, excluding only external
 // extension/Vault/cron/HTTP setup. No dispatch service exists in this container.
 const durable=read('supabase/migrations/20260902140536_add_durable_client_material_processing.sql');
 sql(durable.slice(durable.indexOf('create table if not exists'),durable.indexOf('\ndo $$')));
 sql(durable.slice(durable.indexOf('create or replace function public.enqueue_client_material_list_job'),durable.indexOf('create or replace function public.dispatch_client_material_list_jobs')));
 sql(`create table public.supplier_packages(id uuid primary key,request_id uuid);
 create or replace function auth.jwt() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb || jsonb_build_object('email',(select email from auth.users where id=auth.uid()))$$;`);
 sql(read('supabase/migrations/20260914180138_resumable_material_list_chunks.sql'));
 await runAiCombined(sql,container,database);
} finally { sql(`drop database ${database} with (force);`,'postgres'); }

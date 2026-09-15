import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Synthetic records only, isolated network-none PostgreSQL, no provider access.
const container = `avantia-profile-metadata-${process.pid}`;
const run = (args, input) => spawnSync('docker', args, { input, encoding: 'utf8' });
const sql = input => {
  const r = run(['exec', '-i', container, 'psql', '-h', '127.0.0.1', '-X', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], input);
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const originalFile = read('supabase/migrations/20260812121023_add_scoped_staff_permissions.sql');
const original = originalFile.slice(originalFile.indexOf('create or replace function private.handle_new_user()'), originalFile.indexOf('create or replace function public.staff_update_customer_contact'));
const migration = read('supabase/migrations/20260915044821_preserve_profile_edits_on_unrelated_metadata.sql');
const check = (expression, label) => assert.equal(sql(`select (${expression})::text;`), 'true', label);
const postgresImage = process.env.PG_TEST_IMAGE || 'postgres:17-alpine';
assert.equal(run(['run', '-d', '--rm', '--network', 'none', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', postgresImage]).status, 0);
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (run(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  assert(ready);
  sql(`create role anon; create role authenticated; create schema private; create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create table public.staff_access_grants(email text primary key, active boolean);
    create table public.profiles(id uuid primary key, email text, full_name text, phone text, company_name text, role text, approval_status text, is_active boolean, approved_at timestamptz, updated_at timestamptz);
    ${original}
    create trigger on_auth_user_created after insert or update of email, raw_user_meta_data on auth.users for each row execute function private.handle_new_user();`);
  check(`md5((select prosrc from pg_proc where oid='private.handle_new_user()'::regprocedure))='642c6b42639d8e538506cf3666ca223c'`, 'captured live fingerprint');
  const security = sql(`select row(proowner,proacl,prosecdef,proconfig)::text from pg_proc where oid='private.handle_new_user()'::regprocedure`);
  sql(migration);
  assert.equal(sql(`select row(proowner,proacl,prosecdef,proconfig)::text from pg_proc where oid='private.handle_new_user()'::regprocedure`), security, 'owner ACL security search path unchanged');
  const id = '00000000-0000-0000-0000-000000000001';
  sql(`insert into auth.users values('${id}','client@example.invalid','{"full_name":"Original Name","phone":"+15550000001","company_name":"Original Company"}');`);
  check(`(select full_name='Original Name' and phone='+15550000001' and role='client' and approval_status='pending' and is_active from profiles where id='${id}')`, 'bootstrap retained');
  sql(`update profiles set full_name='Saved Name',phone='+15550000002' where id='${id}';
    update auth.users set raw_user_meta_data=raw_user_meta_data || '{"notifications":false,"alternate_phone":"+15550000009"}' where id='${id}';`);
  check(`(select full_name='Saved Name' and phone='+15550000002' from profiles where id='${id}')`, 'unrelated preferences preserve both profile edits');
  sql(`update auth.users set email='changed@example.invalid' where id='${id}'`);
  check(`(select email='changed@example.invalid' and full_name='Saved Name' and phone='+15550000002' from profiles where id='${id}')`, 'email update still works without restoring stale fields');
  sql(`update auth.users set raw_user_meta_data=raw_user_meta_data || '{"full_name":"Explicit Name"}' where id='${id}'`);
  check(`(select full_name='Explicit Name' and phone='+15550000002' from profiles where id='${id}')`, 'explicit name change affects name only');
  sql(`update auth.users set raw_user_meta_data=raw_user_meta_data || '{"phone":"+15550000003"}' where id='${id}'`);
  check(`(select full_name='Explicit Name' and phone='+15550000003' from profiles where id='${id}')`, 'explicit phone change retained');
  sql(`update auth.users set raw_user_meta_data=raw_user_meta_data || '{"full_name":"","phone":null}' where id='${id}'`);
  check(`(select full_name='Explicit Name' and phone='+15550000003' from profiles where id='${id}')`, 'empty null retain prior coalesce semantics');
  sql(`insert into staff_access_grants values('staff@example.invalid',true);
    insert into auth.users values('00000000-0000-0000-0000-000000000002','staff@example.invalid','{}');`);
  check(`(select role='staff' and approval_status='approved' and approved_at is not null and is_active from profiles where email='staff@example.invalid')`, 'active staff bootstrap unchanged');
  check(`(select company_name='Original Company' from profiles where id='${id}')`, 'company behavior unchanged');
  const second = run(['exec','-i',container,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1'], migration);
  assert.notEqual(second.status,0,'unexpected/reapplied body fails closed');
  console.log('PASS: live body fingerprint, real trigger bootstrap/metadata/email/name/phone/null semantics, staff grants, security metadata, and changed-body rejection.');
} finally {
  run(['stop', container]);
}

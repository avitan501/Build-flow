-- Test fixture ONLY: run inside an isolated disposable PostgreSQL container.
create schema if not exists private;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table public.profiles (id uuid primary key, role text, approval_status text, is_active boolean);
create table public.quote_requests (id uuid primary key);
create function private.is_admin() returns boolean language sql security definer set search_path = '' stable as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and approval_status = 'approved' and is_active) $$;
create function private.is_staff() returns boolean language sql security definer set search_path = '' stable as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'staff' and approval_status = 'approved' and is_active) $$;
grant usage on schema private to authenticated;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into public.profiles values ('00000000-0000-0000-0000-000000000001','staff','approved',true),('00000000-0000-0000-0000-000000000002','client','approved',true),('00000000-0000-0000-0000-000000000003','staff','approved',false);
insert into public.quote_requests values ('10000000-0000-0000-0000-000000000001');
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000004'),('00000000-0000-0000-0000-000000000005'),('00000000-0000-0000-0000-000000000006');
insert into public.profiles values ('00000000-0000-0000-0000-000000000004','staff','approved',true),('00000000-0000-0000-0000-000000000005','admin','approved',true),('00000000-0000-0000-0000-000000000006','admin','approved',true);

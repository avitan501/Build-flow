-- Disposable local database only; no production identities or records.
create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key,email text);
create table public.profiles(id uuid primary key,role text,approval_status text,is_active boolean);
create table public.manager_goals(id uuid primary key default gen_random_uuid(),assignee text,title text,details text,status text,created_by uuid,updated_at timestamptz default now());
grant usage on schema auth,public to authenticated;
grant execute on function auth.uid() to authenticated;
grant select,insert,update,delete on public.manager_goals to authenticated;
insert into auth.users values('00000000-0000-0000-0000-000000000001',' Avitanneto@Gmail.com '),('00000000-0000-0000-0000-000000000002','buildavantiap@gmail.com'),('00000000-0000-0000-0000-000000000003','other-admin@example.invalid');
insert into profiles values('00000000-0000-0000-0000-000000000001','admin','approved',true),('00000000-0000-0000-0000-000000000002','staff','approved',true),('00000000-0000-0000-0000-000000000003','admin','approved',true);
insert into manager_goals(assignee,title,details) values('carlos','Daily summary - 2026-09-12','daily_work_summary:{"date":"2026-09-12","completed":"Work","checkInAt":"2026-09-12T12:00:00Z","checkOutAt":"2026-09-12T13:30:00Z","pauseStartedAt":null,"pausedMilliseconds":1800000,"paidAt":null}');

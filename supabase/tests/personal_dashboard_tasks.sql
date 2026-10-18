-- Run only in a disposable local database after the migration.
-- auth.uid(), private.is_admin() and the standard roles must be present.
begin;
insert into auth.users (id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local test.is_admin = 'true';
set local role authenticated;
insert into public.personal_dashboard_tasks (owner_id,title,seed_key) values
  ('11111111-1111-4111-8111-111111111111','Local personal task','local-test');
do $$ begin
  assert (select count(*) = 1 from public.personal_dashboard_tasks), 'owner reads task';
  begin
    insert into public.personal_dashboard_tasks (owner_id,title) values ('22222222-2222-4222-8222-222222222222','Forged owner');
    raise exception 'foreign insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.personal_dashboard_tasks set owner_id='22222222-2222-4222-8222-222222222222';
    raise exception 'ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.personal_dashboard_tasks;
    raise exception 'hard deletion allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.personal_dashboard_tasks set status='invalid';
    raise exception 'invalid status allowed';
  exception when check_violation then null; end;
end $$;
update public.personal_dashboard_tasks set status='completed', summary='Saved notes';
do $$ begin
  assert (select status='completed' and summary='Saved notes' and updated_at>created_at from public.personal_dashboard_tasks), 'update and timestamp';
end $$;
update public.personal_dashboard_tasks set status='archived';
update public.personal_dashboard_tasks set status='open';
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ declare affected int; begin
  assert (select count(*)=0 from public.personal_dashboard_tasks), 'another admin cannot read private tasks';
  update public.personal_dashboard_tasks set title='Cross-user change';
  get diagnostics affected = row_count;
  assert affected=0, 'another admin cannot update private tasks';
end $$;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local test.is_admin = 'false';
do $$ declare affected int; begin
  assert (select count(*)=0 from public.personal_dashboard_tasks), 'non-owner role denied';
  update public.personal_dashboard_tasks set title='Staff change';
  get diagnostics affected = row_count;
  assert affected=0, 'staff cannot update';
  begin
    insert into public.personal_dashboard_tasks(owner_id,title) values ('11111111-1111-4111-8111-111111111111','Staff task');
    raise exception 'staff insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform * from public.personal_dashboard_tasks; raise exception 'anonymous read allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.personal_dashboard_tasks(owner_id,title) values ('11111111-1111-4111-8111-111111111111','Anon task'); raise exception 'anonymous insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin assert (select count(*)=1 from public.personal_dashboard_tasks where title='Local personal task' and status='open'), 'task intact'; end $$;
rollback;

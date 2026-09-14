-- Run after fixture and candidate migration in the disposable database only.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claims','{"email":"buildavantiap@gmail.com"}',false);
insert into public.request_workflow_steps(request_id,step,assignee,note,updated_by) values ('10000000-0000-0000-0000-000000000001',1,'carlos','Private fixture note','00000000-0000-0000-0000-000000000001');
update public.request_workflow_steps set assignee='david',revision=2 where step=1 and revision=1;
do $$ begin if (select assignee from public.request_workflow_steps where step=1) <> 'david' then raise exception 'Staff save failed'; end if; end $$;
-- Stale revision must never overwrite the saved value.
update public.request_workflow_steps set note='stale' where step=1 and revision=1;
do $$ begin if (select note from public.request_workflow_steps where step=1) <> 'Private fixture note' then raise exception 'Revision guard failed'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin if (select count(*) from public.request_workflow_steps) <> 0 then raise exception 'Customer read leaked'; end if; end $$;
update public.request_workflow_steps set note='customer overwrite';
do $$ begin
  begin insert into public.request_workflow_steps(request_id,step,assignee,updated_by) values ('10000000-0000-0000-0000-000000000001',2,'carlos','00000000-0000-0000-0000-000000000002'); raise exception 'Customer insert allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin if (select count(*) from public.request_workflow_steps) <> 0 then raise exception 'Inactive staff read leaked'; end if; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select set_config('request.jwt.claims','{"email":"unapproved-staff@example.invalid"}',false);
do $$ begin if (select count(*) from public.request_workflow_steps) <> 0 then raise exception 'Unapproved active staff read leaked'; end if; end $$;
update public.request_workflow_steps set note='unauthorized staff overwrite';
do $$ begin
  begin insert into public.request_workflow_steps(request_id,step,assignee,updated_by) values ('10000000-0000-0000-0000-000000000001',2,'carlos','00000000-0000-0000-0000-000000000004'); raise exception 'Unapproved staff insert allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select set_config('request.jwt.claims','{"email":"unapproved-admin@example.invalid"}',false);
do $$ begin if (select count(*) from public.request_workflow_steps) <> 0 then raise exception 'Unapproved active admin read leaked'; end if; end $$;
update public.request_workflow_steps set note='unauthorized admin overwrite';
do $$ begin
  begin insert into public.request_workflow_steps(request_id,step,assignee,updated_by) values ('10000000-0000-0000-0000-000000000001',2,'david','00000000-0000-0000-0000-000000000005'); raise exception 'Unapproved admin insert allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',false);
select set_config('request.jwt.claims','{"email":"avitanneto@gmail.com"}',false);
do $$ begin if (select count(*) from public.request_workflow_steps) <> 1 then raise exception 'Approved owner cannot read'; end if; end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.request_workflow_steps; raise exception 'Anon read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin if (select note from public.request_workflow_steps where step=1) <> 'Private fixture note' then raise exception 'Customer modified note'; end if; end $$;
select 'PASS: staff save, private read, customer/inactive/anon denial, stale revision' as result;

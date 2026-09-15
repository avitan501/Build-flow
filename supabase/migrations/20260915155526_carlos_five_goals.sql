create table private.carlos_five_goals (
 id boolean primary key default true check(id),
 goals jsonb not null default '[]', revision bigint not null default 0,
 updated_at timestamptz not null default now(), updated_by uuid
);
alter table private.carlos_five_goals enable row level security;
revoke all on private.carlos_five_goals from public,anon,authenticated;
insert into private.carlos_five_goals(id) values(true);

-- The existing helper verifies auth.users email plus active, approved profile
-- and exact owner/admin or Carlos/staff role. No user-editable metadata trust.
create function private.carlos_five_goals_access(p_revision bigint default null,p_goals jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.carlos_five_goals%rowtype; g jsonb; n integer; seen integer[]:='{}'; chosen integer:=0;
begin
 if private.carlos_payroll_actor() is null then raise exception 'goals_forbidden' using errcode='42501';end if;
 if p_goals is null then
  select * into b from private.carlos_five_goals where id;
  return jsonb_build_object('revision',b.revision,'goals',b.goals);
 end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_goals)<>'array' or jsonb_array_length(p_goals)<>10 then raise exception 'invalid_goals';end if;
 for g in select value from jsonb_array_elements(p_goals) loop
  if jsonb_typeof(g)<>'object' or not(g ?& array['id','selected','status','note','link','count']) then raise exception 'invalid_goal';end if;
  if (select count(*) from jsonb_object_keys(g))<>6 then raise exception 'invalid_goal';end if;
  if jsonb_typeof(g->'id')<>'number' or (g->>'id')!~'^[0-9]$' then raise exception 'invalid_id';end if;
  n:=(g->>'id')::integer;
  if n=any(seen) then raise exception 'duplicate_goal';end if;seen:=array_append(seen,n);
  if jsonb_typeof(g->'selected')<>'boolean' or jsonb_typeof(g->'note')<>'string' or length(g->>'note')>1200 or jsonb_typeof(g->'link')<>'string' or length(g->>'link')>1000
   or (g->>'status') not in ('in_progress','done','blocked') or jsonb_typeof(g->'status')<>'string'
   or jsonb_typeof(g->'count')<>'number' or (g->>'count')!~'^[0-5]$' then raise exception 'invalid_goal';end if;
  if (g->>'selected')::boolean then chosen:=chosen+1;end if;
  if g->>'status' in ('done','blocked') and length(btrim(g->>'note'))=0 then raise exception 'result_required';end if;
  if g->>'status'='done' and ((g->>'link')!~*'^https?://' or (n=0 and (g->>'count')::integer<>5)) then raise exception 'evidence_required';end if;
 end loop;
 if chosen>5 then raise exception 'five_goal_limit';end if;
 select * into b from private.carlos_five_goals where id for update;
 -- A retry after a lost response is safe, but stale different edits conflict.
 if b.goals=p_goals then return jsonb_build_object('revision',b.revision,'goals',b.goals);end if;
 if b.revision<>p_revision then raise exception 'goals_conflict' using errcode='40001';end if;
 update private.carlos_five_goals set goals=p_goals,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id returning * into b;
 return jsonb_build_object('revision',b.revision,'goals',b.goals);
end $$;
revoke all on function private.carlos_five_goals_access(bigint,jsonb) from public,anon;
grant execute on function private.carlos_five_goals_access(bigint,jsonb) to authenticated;
create function public.get_carlos_five_goals() returns jsonb language sql security invoker set search_path='' as $$ select private.carlos_five_goals_access(); $$;
create function public.save_carlos_five_goals(p_revision bigint,p_goals jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.carlos_five_goals_access(p_revision,p_goals); $$;
revoke all on function public.get_carlos_five_goals() from public,anon;
revoke all on function public.save_carlos_five_goals(bigint,jsonb) from public,anon;
grant execute on function public.get_carlos_five_goals() to authenticated;
grant execute on function public.save_carlos_five_goals(bigint,jsonb) to authenticated;

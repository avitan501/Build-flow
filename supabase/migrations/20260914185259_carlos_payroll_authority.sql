-- Additive payroll only. Never backfill or infer that a historical day was paid.
create table private.carlos_payroll_days (
 work_date date primary key, goal_id uuid not null unique references public.manager_goals(id),
 worked_ms bigint not null check(worked_ms>=0), hourly_cents integer not null default 500 check(hourly_cents=500),
 requested_at timestamptz, paid_at timestamptz, version integer not null default 1
);
create table private.carlos_payroll_requests (
 id uuid primary key, requested_by uuid not null, dates date[] not null, worked_ms bigint not null,
 total_cents bigint not null, created_at timestamptz not null default now()
);
create table private.carlos_payroll_events (
 id bigint generated always as identity primary key, work_date date not null,
 actor_id uuid not null, paid boolean not null, created_at timestamptz not null default now()
);
alter table private.carlos_payroll_days enable row level security;
alter table private.carlos_payroll_requests enable row level security;
alter table private.carlos_payroll_events enable row level security;
revoke all on private.carlos_payroll_days,private.carlos_payroll_requests,private.carlos_payroll_events from public,anon,authenticated;

create function private.carlos_payroll_actor() returns text language sql stable security definer set search_path='' as $$
 select case when lower(btrim(u.email))='avitanneto@gmail.com' and p.role='admin' then 'owner'
   when lower(btrim(u.email))='buildavantiap@gmail.com' and p.role='staff' then 'carlos' end
 from auth.users u join public.profiles p on p.id=u.id
 where u.id=auth.uid() and p.approval_status='approved' and p.is_active=true
$$;
revoke all on function private.carlos_payroll_actor() from public,anon,authenticated;

create function private.daily_summary_json(p_details text) returns jsonb language plpgsql immutable set search_path='' as $$
begin
 if p_details not like 'daily_work_summary:%' then return null;end if;
 return substring(p_details from 20)::jsonb;
exception when others then return null;
end $$;
revoke all on function private.daily_summary_json(text) from public,anon,authenticated;

-- SECURITY INVOKER intentionally distinguishes direct PostgREST DML from the
-- owner-checked RPCs. Neither Carlos nor the owner can forge timestamps by DML.
create function public.guard_daily_pay_fields() returns trigger language plpgsql set search_path='' as $$
declare a jsonb; b jsonb;
begin
 if tg_op<>'INSERT' and old.details like 'daily_work_summary:%' then a:=substring(old.details from 20)::jsonb;end if;
 if tg_op<>'DELETE' and new.details like 'daily_work_summary:%' then b:=substring(new.details from 20)::jsonb;end if;
 if a is null and b is null then return coalesce(new,old);end if;
 -- Only INSERT needs date-creation serialization. UPDATE already owns a row
 -- lock; acquiring the global lock there would invert the RPC lock order.
 if tg_op='INSERT' then perform pg_advisory_xact_lock(7140914);end if;
 if current_user in ('authenticated','anon') then
  if tg_op='DELETE' or (a is not null and (b is null or new.assignee is distinct from old.assignee or new.title is distinct from old.title)) then raise exception 'time_log_protected';end if;
  if a is not null and a->>'date' is distinct from b->>'date' then raise exception 'time_log_protected';end if;
  if jsonb_build_array(a->>'checkInAt',a->>'checkOutAt',a->>'pauseStartedAt',coalesce(a->>'pausedMilliseconds','0'),a->>'paidAt')
     is distinct from jsonb_build_array(b->>'checkInAt',b->>'checkOutAt',b->>'pauseStartedAt',coalesce(b->>'pausedMilliseconds','0'),b->>'paidAt') then raise exception 'use_attendance_payroll_actions';end if;
 elsif a->>'paidAt' is distinct from b->>'paidAt' then
  -- A privileged helper is not itself payment authority. Verify the real user.
  if private.carlos_payroll_actor() is distinct from 'owner' then raise exception 'owner_only' using errcode='42501';end if;
 end if;
 if tg_op='INSERT' and exists(select 1 from public.manager_goals g where g.assignee=new.assignee and g.title=new.title and g.details like 'daily_work_summary:%') then raise exception 'duplicate_work_date';end if;
 return coalesce(new,old);
end $$;
revoke all on function public.guard_daily_pay_fields() from public,anon,authenticated;
create trigger guard_daily_pay_fields before insert or update or delete on public.manager_goals for each row execute function public.guard_daily_pay_fields();

create function private.completed_work_ms(j jsonb) returns bigint language plpgsql immutable set search_path='' as $$
declare elapsed numeric; paused numeric;
begin
 if j->>'checkInAt' is null or j->>'checkOutAt' is null or j->>'pauseStartedAt' is not null then return null;end if;
 elapsed:=extract(epoch from ((j->>'checkOutAt')::timestamptz-(j->>'checkInAt')::timestamptz))*1000;
 paused:=coalesce((j->>'pausedMilliseconds')::numeric,0);
 if elapsed<0 or paused<0 or paused>elapsed then return null;end if;
 return floor(elapsed-paused)::bigint;
exception when others then return null;
end $$;
revoke all on function private.completed_work_ms(jsonb) from public,anon,authenticated;

create function public.carlos_payroll_days() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if private.carlos_payroll_actor() is null then raise exception 'payroll_forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('date',x.j->>'date','workedMs',coalesce(d.worked_ms,private.completed_work_ms(x.j)),
  'paidAt',coalesce(d.paid_at::text,x.j->>'paidAt'),'requestedAt',d.requested_at,'version',coalesce(d.version,0)) order by x.j->>'date' desc),'[]'::jsonb) into result
 from public.manager_goals g cross join lateral (select private.daily_summary_json(g.details) j)x
 left join private.carlos_payroll_days d on d.goal_id=g.id
 where g.assignee='carlos' and x.j->>'date' ~ '^\d{4}-\d{2}-\d{2}$' and private.completed_work_ms(x.j) is not null;
 return result;
end $$;
revoke all on function public.carlos_payroll_days() from public,anon;
grant execute on function public.carlos_payroll_days() to authenticated;

create function public.request_carlos_payroll(p_dates date[],p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d date; g public.manager_goals%rowtype; j jsonb; ms bigint; total bigint:=0; dates date[]; prior private.carlos_payroll_requests%rowtype;
begin
 if private.carlos_payroll_actor() is distinct from 'carlos' then raise exception 'payroll_forbidden' using errcode='42501';end if;
 if p_request_id is null or p_dates is null or cardinality(p_dates) not between 1 and 90 or array_position(p_dates,null) is not null then raise exception 'invalid_days';end if;
 select array_agg(distinct x order by x) into dates from unnest(p_dates)x;
 perform pg_advisory_xact_lock(7140914);
 select * into prior from private.carlos_payroll_requests where id=p_request_id;
 if found then
  if prior.requested_by<>auth.uid() or prior.dates<>dates then raise exception 'request_conflict';end if;
  return jsonb_build_object('totalCents',prior.total_cents,'requested',true);
 end if;
 foreach d in array dates loop
  if (select count(*) from public.manager_goals where assignee='carlos' and title='Daily summary - '||d::text and details like 'daily_work_summary:%')<>1 then raise exception 'ambiguous_work_date';end if;
  select * into g from public.manager_goals where assignee='carlos' and title='Daily summary - '||d::text and details like 'daily_work_summary:%' for update;
  j:=private.daily_summary_json(g.details);ms:=private.completed_work_ms(j);
  if ms is null or j->>'date' is distinct from d::text or j->>'paidAt' is not null
    or d>(now() at time zone 'America/New_York')::date or (j->>'checkOutAt')::timestamptz>now() then raise exception 'day_not_unpaid_completed';end if;
  if exists(select 1 from private.carlos_payroll_days where work_date=d and (paid_at is not null or requested_at is not null)) then raise exception 'day_already_requested';end if;
  insert into private.carlos_payroll_days(work_date,goal_id,worked_ms,requested_at) values(d,g.id,ms,now())
   on conflict(work_date) do update set worked_ms=excluded.worked_ms,requested_at=now(),version=private.carlos_payroll_days.version+1;
  total:=total+ms;
 end loop;
 insert into private.carlos_payroll_requests(id,requested_by,dates,worked_ms,total_cents) values(p_request_id,auth.uid(),dates,total,round(total::numeric*500/3600000));
 return jsonb_build_object('totalCents',round(total::numeric*500/3600000),'requested',true);
end $$;
revoke all on function public.request_carlos_payroll(date[],uuid) from public,anon;
grant execute on function public.request_carlos_payroll(date[],uuid) to authenticated;

create function public.set_carlos_day_paid(p_date date,p_paid boolean,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare g public.manager_goals%rowtype;j jsonb;ms bigint;v integer;
begin
 if private.carlos_payroll_actor() is distinct from 'owner' then raise exception 'owner_only' using errcode='42501';end if;
 if p_date is null or p_paid is null or p_version is null then raise exception 'invalid_day';end if;
 perform pg_advisory_xact_lock(7140914);
 if (select count(*) from public.manager_goals where assignee='carlos' and title='Daily summary - '||p_date::text and details like 'daily_work_summary:%')<>1 then raise exception 'ambiguous_work_date';end if;
 select * into g from public.manager_goals where assignee='carlos' and title='Daily summary - '||p_date::text and details like 'daily_work_summary:%' for update;
 j:=private.daily_summary_json(g.details);ms:=private.completed_work_ms(j);
 if ms is null or j->>'date' is distinct from p_date::text then raise exception 'day_not_completed';end if;
 select version into v from private.carlos_payroll_days where work_date=p_date;
 if coalesce(v,0)<>p_version then raise exception 'payroll_changed';end if;
 insert into private.carlos_payroll_days(work_date,goal_id,worked_ms,paid_at) values(p_date,g.id,ms,case when p_paid then now() end)
 on conflict(work_date) do update set paid_at=case when p_paid then now() end,requested_at=case when p_paid then private.carlos_payroll_days.requested_at end,version=private.carlos_payroll_days.version+1;
 j:=jsonb_set(j,'{paidAt}',case when p_paid then to_jsonb(now()) else 'null'::jsonb end);
 update public.manager_goals set details='daily_work_summary:'||j::text where id=g.id;
 insert into private.carlos_payroll_events(work_date,actor_id,paid) values(p_date,auth.uid(),p_paid);
end $$;
revoke all on function public.set_carlos_day_paid(date,boolean,integer) from public,anon;
grant execute on function public.set_carlos_day_paid(date,boolean,integer) to authenticated;

create function public.record_carlos_attendance(p_date date,p_action text,p_completed text default '',p_open text default '',p_problems text default '') returns void language plpgsql security definer set search_path='' as $$
declare g public.manager_goals%rowtype;j jsonb;stamp timestamptz:=clock_timestamp();paused numeric;
begin
 if private.carlos_payroll_actor() is null then raise exception 'attendance_forbidden' using errcode='42501';end if;
 perform pg_advisory_xact_lock(7140914);
 stamp:=clock_timestamp();
 if p_date is distinct from (stamp at time zone 'America/New_York')::date or p_action is null or p_action not in ('check_in','pause','resume','check_out') then raise exception 'invalid_attendance';end if;
 if exists(select 1 from private.carlos_payroll_days where work_date=p_date) then raise exception 'time_already_submitted';end if;
 if (select count(*) from public.manager_goals where assignee='carlos' and title='Daily summary - '||p_date::text and details like 'daily_work_summary:%')>1 then raise exception 'ambiguous_work_date';end if;
 select * into g from public.manager_goals where assignee='carlos' and title='Daily summary - '||p_date::text and details like 'daily_work_summary:%' for update;
 j:=coalesce(private.daily_summary_json(g.details),jsonb_build_object('date',p_date,'completed','','open','','problems','','pausedMilliseconds',0));
 if j->>'paidAt' is not null then raise exception 'time_already_paid';end if;
 if p_action='check_in' then
  if j->>'checkInAt' is not null then return;end if;
  j:=j||jsonb_build_object('checkInAt',stamp,'checkOutAt',null,'pauseStartedAt',null,'pausedMilliseconds',0);
 else
  if j->>'checkInAt' is null then raise exception 'clock_in_first';end if;
  if j->>'checkOutAt' is not null then
   if p_action='check_out' then return;end if;raise exception 'day_completed';
  end if;
  if p_action='pause' then
   if j->>'pauseStartedAt' is not null then return;end if;
   j:=j||jsonb_build_object('pauseStartedAt',stamp);
  else
   if p_action='resume' and j->>'pauseStartedAt' is null then return;end if;
   paused:=coalesce((j->>'pausedMilliseconds')::numeric,0)+case when j->>'pauseStartedAt' is not null then greatest(0,extract(epoch from(stamp-(j->>'pauseStartedAt')::timestamptz))*1000) else 0 end;
   j:=j||jsonb_build_object('pausedMilliseconds',floor(paused),'pauseStartedAt',null);
   if p_action='check_out' then
    if nullif(btrim(p_completed),'') is null then raise exception 'completed_summary_required';end if;
    j:=j||jsonb_build_object('checkOutAt',stamp,'completed',left(p_completed,4000),'open',left(p_open,4000),'problems',left(p_problems,4000));
   end if;
  end if;
 end if;
 if g.id is null then insert into public.manager_goals(assignee,title,details,status,created_by) values('carlos','Daily summary - '||p_date::text,'daily_work_summary:'||j::text,'open',auth.uid());
 else update public.manager_goals set details='daily_work_summary:'||j::text,status=case when j->>'checkOutAt' is not null and coalesce(j->>'open','')='' then 'completed' else 'open' end where id=g.id;end if;
end $$;
revoke all on function public.record_carlos_attendance(date,text,text,text,text) from public,anon;
grant execute on function public.record_carlos_attendance(date,text,text,text,text) to authenticated;

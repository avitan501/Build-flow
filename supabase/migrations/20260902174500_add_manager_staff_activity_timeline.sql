create table if not exists public.manager_staff_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('page_view', 'communication_sent', 'record_created', 'record_updated', 'record_deleted')),
  page_path text not null,
  page_label text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists manager_staff_activity_user_time_idx
  on public.manager_staff_activity_events(user_id, occurred_at desc);

alter table public.manager_staff_activity_events enable row level security;
revoke all on table public.manager_staff_activity_events from anon, authenticated;
grant select, insert on table public.manager_staff_activity_events to authenticated;

drop policy if exists "manager_staff_activity_read" on public.manager_staff_activity_events;
create policy "manager_staff_activity_read"
on public.manager_staff_activity_events for select to authenticated
using (
  user_id = (select auth.uid())
  or lower(trim(coalesce((select auth.jwt() ->> 'email'), ''))) = 'avitanneto@gmail.com'
);

drop policy if exists "manager_staff_activity_insert" on public.manager_staff_activity_events;
create policy "manager_staff_activity_insert"
on public.manager_staff_activity_events for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

create or replace function public.log_manager_staff_record_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  source_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  destination text;
  label text;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles
    where id = actor_id
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  ) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_table_name = 'manager_goals' and source_row ->> 'title' = 'Employee activity' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  destination := case tg_table_name
    when 'manager_goals' then '/admin/goals-progress'
    when 'manager_outreach_leads' then '/admin/users'
    when 'quote_requests' then '/owner/materials/requests/' || coalesce(source_row ->> 'id', '')
    when 'quote_comparisons' then '/admin/quote-comparison/' || coalesce(source_row ->> 'id', '')
    when 'supplier_quotes' then '/admin/supplier-quotes/' || coalesce(source_row ->> 'id', '')
    when 'workflow_manager_settings' then '/admin/vendors'
    else '/admin/build-map'
  end;
  label := left(coalesce(
    nullif(source_row ->> 'title', ''),
    nullif(source_row ->> 'full_name', ''),
    nullif(source_row ->> 'supplier_name', ''),
    replace(initcap(tg_table_name), '_', ' ')
  ), 160);

  insert into public.manager_staff_activity_events (
    user_id, event_type, page_path, page_label, entity_type, entity_id, metadata
  ) values (
    actor_id,
    case tg_op when 'INSERT' then 'record_created' when 'DELETE' then 'record_deleted' else 'record_updated' end,
    destination,
    replace(initcap(tg_table_name), '_', ' '),
    tg_table_name,
    source_row ->> 'id',
    jsonb_build_object('label', label)
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.log_manager_staff_record_change() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'manager_goals',
    'manager_outreach_leads',
    'quote_requests',
    'quote_comparisons',
    'supplier_quotes',
    'workflow_manager_settings'
  ] loop
    execute format('drop trigger if exists manager_staff_activity_change on public.%I', table_name);
    execute format(
      'create trigger manager_staff_activity_change after insert or update or delete on public.%I for each row execute function public.log_manager_staff_record_change()',
      table_name
    );
  end loop;
end;
$$;

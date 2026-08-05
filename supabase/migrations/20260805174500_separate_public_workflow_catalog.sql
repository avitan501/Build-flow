drop policy if exists "workflow_manager_settings_authenticated_read" on public.workflow_manager_settings;
drop policy if exists "supplier_packages_customer_insert" on public.supplier_packages;

create table if not exists public.workflow_public_catalog (
  id text primary key default 'singleton' check (id = 'singleton'),
  state jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_workflow_public_catalog_updated_at on public.workflow_public_catalog;
create trigger set_workflow_public_catalog_updated_at before update on public.workflow_public_catalog
for each row execute function public.set_quote_workflow_updated_at();

alter table public.workflow_public_catalog enable row level security;

create policy "workflow_public_catalog_read" on public.workflow_public_catalog
for select to anon, authenticated using (true);
create policy "workflow_public_catalog_admin_all" on public.workflow_public_catalog
for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.workflow_public_catalog to anon, authenticated;
grant insert, update, delete on public.workflow_public_catalog to authenticated;

insert into public.workflow_public_catalog (id, state)
values ('singleton', '{}'::jsonb)
on conflict (id) do nothing;

create or replace function public.submit_quote_request_packages(
  p_request_id uuid,
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record record;
  department_record record;
  assigned_supplier_id text;
begin
  select request.id, request.title
  into request_record
  from public.quote_requests request
  where request.id = p_request_id
    and request.project_id = p_project_id
    and request.owner_id = (select auth.uid())
    and request.status = 'draft'
  for update;

  if request_record.id is null then
    raise exception 'Only an owned draft request can be submitted.';
  end if;

  if not exists (
    select 1 from public.quote_request_items item
    where item.request_id = p_request_id and item.owner_id = (select auth.uid())
  ) then
    raise exception 'Add at least one item before submitting.';
  end if;

  for department_record in
    select item.department, jsonb_agg(item.id order by item.created_at) as item_ids
    from public.quote_request_items item
    where item.request_id = p_request_id and item.owner_id = (select auth.uid())
    group by item.department
  loop
    select nullif(
      settings.state->'qualificationSettings'->'products'->item.catalog_item_id->>'supplierId',
      ''
    )
    into assigned_supplier_id
    from public.quote_request_items item
    cross join public.workflow_manager_settings settings
    where item.request_id = p_request_id
      and item.department = department_record.department
      and item.catalog_item_id is not null
      and settings.id = 'singleton'
      and nullif(
        settings.state->'qualificationSettings'->'products'->item.catalog_item_id->>'supplierId',
        ''
      ) is not null
    limit 1;

    insert into public.supplier_packages (
      request_id,
      department,
      supplier_id,
      status,
      payload
    ) values (
      p_request_id,
      department_record.department,
      assigned_supplier_id,
      'pending_approval',
      jsonb_build_object(
        'request_title', request_record.title,
        'item_ids', department_record.item_ids
      )
    )
    on conflict (request_id, department) do nothing;
  end loop;

  update public.quote_requests
  set status = 'submitted', submitted_at = now()
  where id = p_request_id
    and project_id = p_project_id
    and owner_id = (select auth.uid())
    and status = 'draft';
end;
$$;

revoke all on function public.submit_quote_request_packages(uuid, uuid) from public, anon;
grant execute on function public.submit_quote_request_packages(uuid, uuid) to authenticated;

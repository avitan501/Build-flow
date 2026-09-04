alter table public.request_client_documents
  add column if not exists manager_preview_token uuid not null default gen_random_uuid();

create unique index if not exists request_client_documents_manager_preview_token_key
on public.request_client_documents (manager_preview_token);

create or replace function public.set_request_client_document_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  new.public_token := old.public_token;
  new.manager_preview_token := old.manager_preview_token;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create table if not exists public.request_client_document_views (
  id uuid primary key default gen_random_uuid(),
  client_document_id uuid not null references public.request_client_documents(id) on delete cascade,
  document_version integer not null check (document_version > 0),
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  open_count integer not null default 1 check (open_count > 0),
  created_at timestamptz not null default now(),
  unique (client_document_id, document_version),
  check (last_opened_at >= first_opened_at)
);

create index if not exists request_client_document_views_last_opened_idx
on public.request_client_document_views (client_document_id, last_opened_at desc);

alter table public.request_client_document_views enable row level security;
revoke all on table public.request_client_document_views from public, anon, authenticated;
grant select on table public.request_client_document_views to authenticated;

drop policy if exists "request_client_document_views_staff_read" on public.request_client_document_views;
create policy "request_client_document_views_staff_read"
on public.request_client_document_views for select
to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1
    from public.request_client_documents document
    where document.id = request_client_document_views.client_document_id
  )
);

create or replace function public.record_request_client_document_view(
  p_public_token uuid,
  p_document_version integer,
  p_manager_preview_token uuid default null
)
returns table (recorded boolean, opened_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_document public.request_client_documents%rowtype;
  saved_view public.request_client_document_views%rowtype;
begin
  if p_public_token is null or p_document_version is null or p_document_version < 1 then
    return query select false, null::timestamptz;
    return;
  end if;

  select document.* into selected_document
  from public.request_client_documents document
  where document.public_token = p_public_token
    and document.version = p_document_version
    and document.document_type in ('estimate', 'invoice')
  limit 1;

  if not found then
    return query select false, null::timestamptz;
    return;
  end if;

  if p_manager_preview_token is not null
     and p_manager_preview_token = selected_document.manager_preview_token then
    return query select false, null::timestamptz;
    return;
  end if;

  if (select auth.uid()) is not null
     and ((select private.is_admin()) or (select private.has_staff_capability('customers'))) then
    return query select false, null::timestamptz;
    return;
  end if;

  insert into public.request_client_document_views (
    client_document_id,
    document_version,
    first_opened_at,
    last_opened_at,
    open_count
  ) values (
    selected_document.id,
    selected_document.version,
    clock_timestamp(),
    clock_timestamp(),
    1
  )
  on conflict (client_document_id, document_version) do update
  set last_opened_at = excluded.last_opened_at,
      open_count = public.request_client_document_views.open_count + 1
  where public.request_client_document_views.last_opened_at
        <= excluded.last_opened_at - interval '10 seconds'
  returning * into saved_view;

  if saved_view.id is null then
    return query
      select false, view_row.last_opened_at
      from public.request_client_document_views view_row
      where view_row.client_document_id = selected_document.id
        and view_row.document_version = selected_document.version;
    return;
  end if;

  return query select true, saved_view.last_opened_at;
end;
$$;

revoke all on function public.record_request_client_document_view(uuid, integer, uuid)
from public, anon, authenticated;
grant execute on function public.record_request_client_document_view(uuid, integer, uuid)
to anon, authenticated;

comment on table public.request_client_document_views is
'Version-scoped opens of live estimates and invoices. Direct writes are denied; the opaque-token RPC records client views.';

comment on function public.record_request_client_document_view(uuid, integer, uuid) is
'Records a current Estimate or Invoice view by opaque token while suppressing authenticated staff and manager-preview links.';

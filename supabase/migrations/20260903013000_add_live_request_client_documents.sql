create table if not exists public.request_client_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('estimate', 'invoice', 'receipt')),
  document_number text not null check (char_length(trim(document_number)) between 3 and 40),
  document_data jsonb not null default '{}'::jsonb check (jsonb_typeof(document_data) = 'object'),
  public_token uuid not null default gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  sent_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, document_type),
  unique (public_token)
);

create index if not exists request_client_documents_request_idx
on public.request_client_documents (request_id, updated_at desc);

create or replace function public.set_request_client_document_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  new.public_token := old.public_token;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists set_request_client_document_version on public.request_client_documents;
create trigger set_request_client_document_version
before update on public.request_client_documents
for each row execute function public.set_request_client_document_version();

alter table public.request_client_documents enable row level security;
revoke all on public.request_client_documents from anon, authenticated;
grant select, insert, update on public.request_client_documents to authenticated;

create policy "request_client_documents_staff_read"
on public.request_client_documents for select to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('customers')));

create policy "request_client_documents_staff_insert"
on public.request_client_documents for insert to authenticated
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "request_client_documents_staff_update"
on public.request_client_documents for update to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('customers')))
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and updated_by = (select auth.uid())
);

comment on table public.request_client_documents is
'One live, replaceable customer-facing document per request and type. Public access is only through the opaque token handled by the server.';

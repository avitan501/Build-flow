create extension if not exists pgcrypto with schema extensions;

create table public.request_client_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  client_document_id uuid not null references public.request_client_documents(id) on delete restrict,
  document_version integer not null check (document_version > 0),
  document_type text not null check (document_type in ('estimate', 'invoice')),
  document_number text not null check (char_length(trim(document_number)) between 3 and 40),
  terms_version text not null check (char_length(trim(terms_version)) between 3 and 80),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  terms_text text not null check (char_length(terms_text) between 1 and 8000),
  signer_name text not null check (char_length(trim(signer_name)) between 2 and 120),
  signer_email text check (signer_email is null or char_length(trim(signer_email)) between 3 and 320),
  accepted_at timestamptz not null default now(),
  accepted_timezone text not null default 'America/New_York' check (accepted_timezone = 'America/New_York'),
  unique (client_document_id, document_version, terms_version, terms_hash)
);

comment on table public.request_client_document_acceptances is
'Immutable acknowledgement receipts for the exact public client-document and terms versions shown to a signer.';

alter table public.request_client_document_acceptances enable row level security;
revoke all on table public.request_client_document_acceptances from public, anon, authenticated;
revoke all on table public.request_client_document_acceptances from service_role;
grant select, insert on table public.request_client_document_acceptances to service_role;

create or replace function private.reject_request_client_document_acceptance_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Client document acceptance receipts are immutable.';
end;
$$;

revoke all on function private.reject_request_client_document_acceptance_mutation() from public, anon, authenticated;

create trigger reject_request_client_document_acceptance_mutation
before update or delete on public.request_client_document_acceptances
for each row execute function private.reject_request_client_document_acceptance_mutation();

create or replace function public.accept_request_client_document(
  p_public_token uuid,
  p_document_version integer,
  p_terms_version text,
  p_terms_hash text,
  p_terms_text text,
  p_signer_name text,
  p_signer_email text default null
)
returns table (
  acceptance_id uuid,
  accepted_document_version integer,
  accepted_terms_version text,
  accepted_terms_hash text,
  accepted_signer_name text,
  accepted_signer_email text,
  accepted_timestamp timestamptz,
  accepted_timezone text,
  was_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_document public.request_client_documents%rowtype;
  existing_acceptance public.request_client_document_acceptances%rowtype;
  saved_acceptance public.request_client_document_acceptances%rowtype;
  document_email text;
begin
  select document.*
  into selected_document
  from public.request_client_documents as document
  where document.public_token = p_public_token
  for update;

  if not found then
    raise exception 'client_document_not_found';
  end if;
  if selected_document.document_type not in ('estimate', 'invoice') then
    raise exception 'client_document_not_acceptable';
  end if;
  if selected_document.version <> p_document_version then
    raise exception 'client_document_version_changed';
  end if;
  if char_length(trim(coalesce(p_terms_version, ''))) not between 3 and 80
    or coalesce(p_terms_hash, '') !~ '^[0-9a-f]{64}$'
    or char_length(coalesce(p_terms_text, '')) not between 1 and 8000 then
    raise exception 'client_document_terms_invalid';
  end if;
  if pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_terms_text, 'UTF8'), 'sha256'), 'hex') <> p_terms_hash then
    raise exception 'client_document_terms_hash_mismatch';
  end if;
  if char_length(trim(coalesce(p_signer_name, ''))) not between 2 and 120 then
    raise exception 'client_document_signer_invalid';
  end if;

  document_email := lower(trim(coalesce(selected_document.document_data ->> 'clientEmail', '')));
  if document_email = '' then
    p_signer_email := null;
  elsif lower(trim(coalesce(p_signer_email, ''))) <> document_email then
    raise exception 'client_document_email_mismatch';
  else
    p_signer_email := document_email;
  end if;

  select acceptance.*
  into existing_acceptance
  from public.request_client_document_acceptances as acceptance
  where acceptance.client_document_id = selected_document.id
    and acceptance.document_version = selected_document.version
    and acceptance.terms_version = trim(p_terms_version)
    and acceptance.terms_hash = p_terms_hash
  limit 1;

  if found then
    return query select
      existing_acceptance.id,
      existing_acceptance.document_version,
      existing_acceptance.terms_version,
      existing_acceptance.terms_hash,
      existing_acceptance.signer_name,
      existing_acceptance.signer_email,
      existing_acceptance.accepted_at,
      existing_acceptance.accepted_timezone,
      false;
    return;
  end if;

  insert into public.request_client_document_acceptances (
    client_document_id,
    document_version,
    document_type,
    document_number,
    terms_version,
    terms_hash,
    terms_text,
    signer_name,
    signer_email
  ) values (
    selected_document.id,
    selected_document.version,
    selected_document.document_type,
    selected_document.document_number,
    trim(p_terms_version),
    p_terms_hash,
    p_terms_text,
    trim(p_signer_name),
    p_signer_email
  )
  returning * into saved_acceptance;

  return query select
    saved_acceptance.id,
    saved_acceptance.document_version,
    saved_acceptance.terms_version,
    saved_acceptance.terms_hash,
    saved_acceptance.signer_name,
    saved_acceptance.signer_email,
    saved_acceptance.accepted_at,
    saved_acceptance.accepted_timezone,
    true;
end;
$$;

revoke all on function public.accept_request_client_document(uuid, integer, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.accept_request_client_document(uuid, integer, text, text, text, text, text) to service_role;

drop function if exists public.get_request_client_document(uuid);

create function public.get_request_client_document(p_public_token uuid)
returns table (
  document_type text,
  document_number text,
  document_data jsonb,
  version integer,
  updated_at timestamptz,
  acceptance_id uuid,
  accepted_document_version integer,
  accepted_terms_version text,
  accepted_terms_hash text,
  accepted_signer_name text,
  accepted_signer_email text,
  accepted_timestamp timestamptz,
  accepted_timezone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    document.document_type,
    document.document_number,
    document.document_data,
    document.version,
    document.updated_at,
    acceptance.id,
    acceptance.document_version,
    acceptance.terms_version,
    acceptance.terms_hash,
    acceptance.signer_name,
    acceptance.signer_email,
    acceptance.accepted_at,
    acceptance.accepted_timezone
  from public.request_client_documents as document
  left join lateral (
    select receipt.*
    from public.request_client_document_acceptances as receipt
    where receipt.client_document_id = document.id
      and receipt.document_version = document.version
    order by receipt.accepted_at desc
    limit 1
  ) as acceptance on true
  where document.public_token = p_public_token
  limit 1;
$$;

revoke all on function public.get_request_client_document(uuid) from public;
grant execute on function public.get_request_client_document(uuid) to anon, authenticated;

comment on function public.get_request_client_document(uuid) is
'Returns one live document and only its latest current-version acknowledgement receipt for an opaque public token.';

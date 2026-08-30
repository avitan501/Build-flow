create sequence if not exists public.quote_request_public_number_seq
  as integer
  minvalue 100000
  maxvalue 999999
  start with 100000
  increment by 1
  no cycle;

alter table public.quote_requests
  add column if not exists public_number integer;

alter table public.quote_requests
  alter column public_number set default nextval('public.quote_request_public_number_seq');

update public.quote_requests
set public_number = nextval('public.quote_request_public_number_seq')
where public_number is null;

alter table public.quote_requests
  alter column public_number set not null;

alter table public.quote_requests
  drop constraint if exists quote_requests_public_number_range;
alter table public.quote_requests
  add constraint quote_requests_public_number_range
  check (public_number between 100000 and 999999);

create unique index if not exists quote_requests_public_number_uidx
  on public.quote_requests (public_number);

revoke all on sequence public.quote_request_public_number_seq from public, anon;
grant usage, select on sequence public.quote_request_public_number_seq to authenticated;
grant all on sequence public.quote_request_public_number_seq to service_role;

create or replace function private.keep_quote_request_public_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.public_number is distinct from old.public_number then
    raise exception 'request_public_number_is_immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.keep_quote_request_public_number()
  from public, anon, authenticated;

drop trigger if exists keep_quote_request_public_number on public.quote_requests;
create trigger keep_quote_request_public_number
before update of public_number on public.quote_requests
for each row execute function private.keep_quote_request_public_number();

create table if not exists public.customer_request_portal_access (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  normalized_phone text not null check (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  delivery_address text not null default '' check (char_length(delivery_address) <= 500),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id)
);

create index if not exists customer_request_portal_access_phone_idx
  on public.customer_request_portal_access (normalized_phone, created_at desc);
create index if not exists customer_request_portal_access_claimed_idx
  on public.customer_request_portal_access (claimed_by, created_at desc)
  where claimed_by is not null;

alter table public.customer_request_portal_access enable row level security;
revoke all on table public.customer_request_portal_access from public, anon, authenticated;
grant select on table public.customer_request_portal_access to authenticated;
grant all on table public.customer_request_portal_access to service_role;

drop policy if exists "customer_request_portal_access_owner_read" on public.customer_request_portal_access;
create policy "customer_request_portal_access_owner_read"
on public.customer_request_portal_access
for select
to authenticated
using ((select auth.uid()) = claimed_by);

create or replace function private.normalized_portal_phone(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(value, '') ~ '^\+[1-9][0-9]{7,14}$' then value
    else ''
  end
$$;

revoke all on function private.normalized_portal_phone(text)
  from public, anon, authenticated;

create or replace function public.claim_customer_request_portal_access()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified_phone text;
  claimed_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;

  verified_phone := private.normalized_portal_phone(
    coalesce((select auth.jwt() ->> 'phone'), '')
  );
  if verified_phone = '' then
    raise exception 'verified_phone_required';
  end if;

  update public.customer_request_portal_access access
  set claimed_by = (select auth.uid()),
      claimed_at = coalesce(access.claimed_at, now()),
      updated_at = now()
  where access.normalized_phone = verified_phone
    and (access.claimed_by is null or access.claimed_by = (select auth.uid()));

  get diagnostics claimed_count = row_count;
  return claimed_count;
end;
$$;

revoke all on function public.claim_customer_request_portal_access()
  from public, anon;
grant execute on function public.claim_customer_request_portal_access()
  to authenticated;

create table if not exists public.aura_sms_request_confirmations (
  confirmation_communication_id uuid primary key references public.aura_communications(id) on delete restrict,
  request_id uuid unique references public.quote_requests(id) on delete set null,
  normalized_phone text not null check (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  confirmation_actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.aura_sms_request_confirmations enable row level security;
revoke all on table public.aura_sms_request_confirmations from public, anon, authenticated;
grant all on table public.aura_sms_request_confirmations to service_role;

comment on table public.aura_sms_request_confirmations is
  'Idempotency ledger for an explicit customer confirmation in an inbound SMS conversation.';
comment on column public.quote_requests.public_number is
  'Immutable public six-digit request identifier. It is never an authentication credential.';

create table if not exists public.aura_sms_request_pending_confirmations (
  id uuid primary key default gen_random_uuid(),
  normalized_phone text not null check (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  customer_name text not null check (char_length(customer_name) between 1 and 160),
  customer_address text not null default '' check (char_length(customer_address) <= 500),
  title text not null check (char_length(title) between 1 and 180),
  department text not null check (char_length(department) between 1 and 100),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  source_communication_ids uuid[] not null default '{}',
  summary_text text not null check (char_length(summary_text) between 1 and 1600),
  summary_hash text not null check (summary_hash ~ '^[a-f0-9]{64}$'),
  summary_communication_id uuid references public.aura_communications(id) on delete set null,
  summary_sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'send_failed', 'superseded', 'confirmed')),
  confirmation_communication_id uuid unique references public.aura_communications(id) on delete restrict,
  request_id uuid unique references public.quote_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists aura_sms_request_one_pending_per_phone_uidx
  on public.aura_sms_request_pending_confirmations (normalized_phone)
  where status = 'pending';
create unique index if not exists aura_sms_request_summary_hash_uidx
  on public.aura_sms_request_pending_confirmations (normalized_phone, summary_hash)
  where status in ('pending', 'confirmed');

create table if not exists public.customer_request_portal_invite_outbox (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  normalized_phone text not null check (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  message text not null check (char_length(message) between 1 and 1600),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aura_sms_request_pending_confirmations enable row level security;
alter table public.customer_request_portal_invite_outbox enable row level security;
revoke all on table public.aura_sms_request_pending_confirmations from public, anon, authenticated;
revoke all on table public.customer_request_portal_invite_outbox from public, anon, authenticated;
grant all on table public.aura_sms_request_pending_confirmations to service_role;
grant all on table public.customer_request_portal_invite_outbox to service_role;

comment on table public.aura_sms_request_pending_confirmations is
  'Exact AI-prepared request snapshots awaiting a later explicit customer confirmation.';
comment on table public.customer_request_portal_invite_outbox is
  'Durable transactional SMS invitations created only after the request transaction succeeds.';

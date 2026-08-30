create table if not exists public.public_start_text_requests (
  id uuid primary key default gen_random_uuid(),
  normalized_phone text not null,
  ip_hash text not null,
  idempotency_key text not null unique,
  template_version text not null,
  consented_at timestamptz not null default now(),
  user_agent text,
  status text not null default 'processing' check (status in ('processing', 'sent', 'suppressed', 'failed')),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_start_text_phone_created_idx
  on public.public_start_text_requests (normalized_phone, created_at desc);

create index if not exists public_start_text_ip_created_idx
  on public.public_start_text_requests (ip_hash, created_at desc);

alter table public.public_start_text_requests enable row level security;
revoke all on table public.public_start_text_requests from public, anon, authenticated;
grant all on table public.public_start_text_requests to service_role;

comment on table public.public_start_text_requests is
  'Audited, rate-limited consent records for the public Start by text experience.';

create table if not exists public.aura_communications (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('quo', 'whatsapp', 'gmail', 'manual')),
  channel text not null check (channel in ('call', 'sms', 'whatsapp', 'email', 'note')),
  external_activity_id text not null,
  external_conversation_id text,
  contact_id uuid references public.aura_contacts(id) on delete set null,
  direction text check (direction in ('incoming', 'outgoing', 'internal')),
  counterparty_phone text,
  counterparty_email text,
  business_phone text,
  subject text,
  body text,
  summary text,
  transcript text,
  next_steps jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  status text,
  duration_seconds integer,
  occurred_at timestamptz not null,
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_activity_id)
);

create index if not exists aura_communications_phone_occurred_idx
  on public.aura_communications(counterparty_phone, occurred_at desc);
create index if not exists aura_communications_contact_occurred_idx
  on public.aura_communications(contact_id, occurred_at desc);
create index if not exists aura_communications_channel_occurred_idx
  on public.aura_communications(channel, occurred_at desc);

create table if not exists public.aura_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('quo', 'whatsapp')),
  external_event_id text not null,
  event_type text not null,
  activity_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create index if not exists aura_webhook_events_created_idx
  on public.aura_webhook_events(provider, created_at desc);

drop trigger if exists set_aura_communications_updated_at on public.aura_communications;
create trigger set_aura_communications_updated_at
before update on public.aura_communications
for each row execute function public.set_aura_updated_at();

alter table public.aura_communications enable row level security;
alter table public.aura_webhook_events enable row level security;

revoke all on table public.aura_communications from public, anon, authenticated;
revoke all on table public.aura_webhook_events from public, anon, authenticated;
grant all on table public.aura_communications to service_role;
grant all on table public.aura_webhook_events to service_role;

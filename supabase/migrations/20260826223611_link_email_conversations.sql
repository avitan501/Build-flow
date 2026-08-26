alter table public.aura_communications
  add column if not exists mailbox_address text,
  add column if not exists message_id text,
  add column if not exists in_reply_to text,
  add column if not exists read_at timestamptz;

create index if not exists aura_communications_email_counterparty_idx
  on public.aura_communications (lower(counterparty_email), occurred_at desc)
  where channel = 'email' and counterparty_email is not null;

create index if not exists aura_communications_message_id_idx
  on public.aura_communications (message_id)
  where message_id is not null;

create table if not exists public.aura_communication_links (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.aura_communications(id) on delete cascade,
  entity_type text not null check (entity_type in ('client', 'lead', 'supplier', 'material_request')),
  entity_id text not null check (char_length(trim(entity_id)) between 1 and 160),
  entity_label text not null default '' check (char_length(entity_label) <= 240),
  link_source text not null default 'automatic' check (link_source in ('automatic', 'manual', 'thread')),
  confidence numeric(5, 4) not null default 1 check (confidence >= 0 and confidence <= 1),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (communication_id, entity_type, entity_id)
);

create index if not exists aura_communication_links_entity_idx
  on public.aura_communication_links (entity_type, entity_id, created_at desc);

alter table public.aura_communication_links enable row level security;
revoke all on public.aura_communication_links from public, anon, authenticated;
grant all on public.aura_communication_links to service_role;

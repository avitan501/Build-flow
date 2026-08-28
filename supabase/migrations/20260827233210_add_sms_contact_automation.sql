alter table public.aura_contacts
  add column if not exists sms_ai_mode text not null default 'off',
  add column if not exists sms_ai_style text not null default 'professional',
  add column if not exists auto_create_request_drafts boolean not null default true;

alter table public.aura_contacts
  drop constraint if exists aura_contacts_sms_ai_mode_check;
alter table public.aura_contacts
  add constraint aura_contacts_sms_ai_mode_check
  check (sms_ai_mode in ('off', 'draft', 'auto_safe'));

alter table public.aura_contacts
  drop constraint if exists aura_contacts_sms_ai_style_check;
alter table public.aura_contacts
  add constraint aura_contacts_sms_ai_style_check
  check (sms_ai_style in ('professional', 'friendly', 'brief'));

create table if not exists public.aura_sms_reply_drafts (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.aura_communications(id) on delete cascade,
  contact_id uuid references public.aura_contacts(id) on delete set null,
  counterparty_phone text not null,
  reply_text text not null check (char_length(reply_text) between 1 and 1600),
  decision text not null default 'draft' check (decision in ('draft', 'auto_sent', 'blocked', 'sent_manually')),
  safety_reason text,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (communication_id)
);

create table if not exists public.aura_sms_request_drafts (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.aura_communications(id) on delete cascade,
  contact_id uuid references public.aura_contacts(id) on delete set null,
  sender_phone text not null,
  customer_name text not null,
  title text not null,
  department text not null default 'Unassigned',
  items jsonb not null default '[]'::jsonb,
  original_message text,
  status text not null default 'new' check (status in ('new', 'converted', 'dismissed')),
  created_request_id uuid references public.quote_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (communication_id),
  check (jsonb_typeof(items) = 'array')
);

create index if not exists aura_sms_reply_drafts_phone_created_idx
  on public.aura_sms_reply_drafts(counterparty_phone, created_at desc);
create index if not exists aura_sms_request_drafts_status_created_idx
  on public.aura_sms_request_drafts(status, created_at desc);
create index if not exists aura_sms_request_drafts_phone_created_idx
  on public.aura_sms_request_drafts(sender_phone, created_at desc);

drop trigger if exists set_aura_sms_reply_drafts_updated_at on public.aura_sms_reply_drafts;
create trigger set_aura_sms_reply_drafts_updated_at
before update on public.aura_sms_reply_drafts
for each row execute function public.set_aura_updated_at();

drop trigger if exists set_aura_sms_request_drafts_updated_at on public.aura_sms_request_drafts;
create trigger set_aura_sms_request_drafts_updated_at
before update on public.aura_sms_request_drafts
for each row execute function public.set_aura_updated_at();

alter table public.aura_sms_reply_drafts enable row level security;
alter table public.aura_sms_request_drafts enable row level security;

revoke all on table public.aura_sms_reply_drafts from public, anon, authenticated;
revoke all on table public.aura_sms_request_drafts from public, anon, authenticated;
grant all on table public.aura_sms_reply_drafts to service_role;
grant all on table public.aura_sms_request_drafts to service_role;
grant select, update on table public.aura_sms_reply_drafts to authenticated;
grant select, update on table public.aura_sms_request_drafts to authenticated;

drop policy if exists "aura_sms_reply_drafts_manager_read" on public.aura_sms_reply_drafts;
create policy "aura_sms_reply_drafts_manager_read"
on public.aura_sms_reply_drafts for select to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_sms_reply_drafts_manager_update" on public.aura_sms_reply_drafts;
create policy "aura_sms_reply_drafts_manager_update"
on public.aura_sms_reply_drafts for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

drop policy if exists "aura_sms_request_drafts_manager_read" on public.aura_sms_request_drafts;
create policy "aura_sms_request_drafts_manager_read"
on public.aura_sms_request_drafts for select to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_sms_request_drafts_manager_update" on public.aura_sms_request_drafts;
create policy "aura_sms_request_drafts_manager_update"
on public.aura_sms_request_drafts for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

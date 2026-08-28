create table if not exists public.aura_sms_ai_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  preferred_voice text not null default 'friendly',
  max_sentences smallint not null default 2 check (max_sentences between 1 and 3),
  match_customer_language boolean not null default true,
  auto_acknowledge_follow_ups boolean not null default true,
  auto_ask_delivery_details boolean not null default true,
  auto_acknowledge_pricing boolean not null default true,
  auto_create_request_drafts boolean not null default true,
  custom_instructions text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aura_sms_ai_settings_voice_check
    check (preferred_voice in ('professional', 'friendly', 'brief')),
  constraint aura_sms_ai_settings_custom_instructions_check
    check (char_length(custom_instructions) <= 1500)
);

insert into public.aura_sms_ai_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists set_aura_sms_ai_settings_updated_at
  on public.aura_sms_ai_settings;
create trigger set_aura_sms_ai_settings_updated_at
before update on public.aura_sms_ai_settings
for each row execute function public.set_aura_updated_at();

alter table public.aura_sms_ai_settings enable row level security;

revoke all on table public.aura_sms_ai_settings from public, anon, authenticated;
grant all on table public.aura_sms_ai_settings to service_role;
grant select, update on table public.aura_sms_ai_settings to authenticated;

drop policy if exists "aura_sms_ai_settings_manager_read"
  on public.aura_sms_ai_settings;
create policy "aura_sms_ai_settings_manager_read"
on public.aura_sms_ai_settings for select to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_sms_ai_settings_manager_update"
  on public.aura_sms_ai_settings;
create policy "aura_sms_ai_settings_manager_update"
on public.aura_sms_ai_settings for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

alter table public.aura_sms_reply_drafts
  drop constraint if exists aura_sms_reply_drafts_decision_check;
alter table public.aura_sms_reply_drafts
  add constraint aura_sms_reply_drafts_decision_check
  check (decision in ('draft', 'auto_sent', 'blocked', 'sent_manually', 'send_failed'));

comment on table public.aura_sms_ai_settings is
  'Manager-controlled defaults for guarded customer SMS replies. Contact-level mode and style remain available in Communications.';

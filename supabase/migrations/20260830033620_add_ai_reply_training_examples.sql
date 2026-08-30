alter table public.aura_contacts
  alter column sms_ai_mode set default 'auto_safe';

create table if not exists public.aura_ai_reply_examples (
  id uuid primary key default gen_random_uuid(),
  customer_message text not null check (char_length(customer_message) between 1 and 1600),
  approved_reply text not null check (char_length(approved_reply) between 1 and 1600),
  language text,
  tags text[] not null default '{}',
  enabled boolean not null default true,
  source_draft_id uuid references public.aura_sms_reply_drafts(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aura_ai_reply_examples_language_length
    check (language is null or char_length(language) <= 40),
  constraint aura_ai_reply_examples_tags_limit
    check (cardinality(tags) <= 12)
);

create unique index if not exists aura_ai_reply_examples_source_draft_uidx
  on public.aura_ai_reply_examples(source_draft_id);
create index if not exists aura_ai_reply_examples_enabled_updated_idx
  on public.aura_ai_reply_examples(enabled, updated_at desc);

create table if not exists public.aura_ai_reply_feedback (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.aura_communications(id) on delete cascade,
  draft_id uuid references public.aura_sms_reply_drafts(id) on delete set null,
  original_reply text not null check (char_length(original_reply) between 1 and 1600),
  corrected_reply text not null check (char_length(corrected_reply) between 1 and 1600),
  promoted_to_example boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.aura_ai_reply_knowledge (
  id uuid primary key default gen_random_uuid(),
  fact text not null check (char_length(fact) between 1 and 2000),
  category text not null default 'general' check (char_length(category) between 1 and 80),
  source_path text not null check (char_length(source_path) between 1 and 500),
  enabled boolean not null default true,
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fact, source_path)
);

create index if not exists aura_ai_reply_knowledge_enabled_reviewed_idx
  on public.aura_ai_reply_knowledge(enabled, reviewed_at desc);

insert into public.aura_ai_reply_knowledge (fact, category, source_path)
values
  ('Avantia reviews the requested material, size, quantity, and delivery details and confirms current supplier pricing before an order is approved.', 'pricing', '/shop#shop-faq'),
  ('Prices, taxes, freight, lead times, and availability may change until Avantia confirms the order in writing.', 'pricing', '/terms'),
  ('A requested delivery date is not guaranteed until Avantia confirms it. Delivery depends on stock, supplier schedules, traffic, weather, and jobsite conditions.', 'delivery', '/delivery-policy'),
  ('Return eligibility depends on the supplying store or manufacturer and the written terms confirmed before purchase. Custom, cut, mixed, tinted, opened, clearance, and special-order materials may be final sale.', 'returns', '/returns'),
  ('For damaged or incorrect materials, photograph the damage, labels, packaging, and delivery ticket immediately and contact Avantia promptly.', 'damaged-materials', '/returns')
on conflict (fact, source_path) do nothing;

create index if not exists aura_ai_reply_feedback_communication_created_idx
  on public.aura_ai_reply_feedback(communication_id, created_at desc);
create index if not exists aura_ai_reply_feedback_draft_idx
  on public.aura_ai_reply_feedback(draft_id)
  where draft_id is not null;

drop trigger if exists set_aura_ai_reply_examples_updated_at
  on public.aura_ai_reply_examples;
create trigger set_aura_ai_reply_examples_updated_at
before update on public.aura_ai_reply_examples
for each row execute function public.set_aura_updated_at();

drop trigger if exists set_aura_ai_reply_knowledge_updated_at
  on public.aura_ai_reply_knowledge;
create trigger set_aura_ai_reply_knowledge_updated_at
before update on public.aura_ai_reply_knowledge
for each row execute function public.set_aura_updated_at();

alter table public.aura_ai_reply_examples enable row level security;
alter table public.aura_ai_reply_feedback enable row level security;
alter table public.aura_ai_reply_knowledge enable row level security;

revoke all on table public.aura_ai_reply_examples from public, anon, authenticated;
revoke all on table public.aura_ai_reply_feedback from public, anon, authenticated;
revoke all on table public.aura_ai_reply_knowledge from public, anon, authenticated;
grant all on table public.aura_ai_reply_examples to service_role;
grant all on table public.aura_ai_reply_feedback to service_role;
grant all on table public.aura_ai_reply_knowledge to service_role;
grant select, insert, update, delete on table public.aura_ai_reply_examples to authenticated;
grant select, insert on table public.aura_ai_reply_feedback to authenticated;
grant select, insert, update, delete on table public.aura_ai_reply_knowledge to authenticated;

drop policy if exists "aura_ai_reply_examples_manager_select"
  on public.aura_ai_reply_examples;
create policy "aura_ai_reply_examples_manager_select"
on public.aura_ai_reply_examples for select to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_examples_manager_insert"
  on public.aura_ai_reply_examples;
create policy "aura_ai_reply_examples_manager_insert"
on public.aura_ai_reply_examples for insert to authenticated
with check ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_examples_manager_update"
  on public.aura_ai_reply_examples;
create policy "aura_ai_reply_examples_manager_update"
on public.aura_ai_reply_examples for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_examples_manager_delete"
  on public.aura_ai_reply_examples;
create policy "aura_ai_reply_examples_manager_delete"
on public.aura_ai_reply_examples for delete to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_feedback_manager_select"
  on public.aura_ai_reply_feedback;
create policy "aura_ai_reply_feedback_manager_select"
on public.aura_ai_reply_feedback for select to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_feedback_manager_insert"
  on public.aura_ai_reply_feedback;
create policy "aura_ai_reply_feedback_manager_insert"
on public.aura_ai_reply_feedback for insert to authenticated
with check ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_knowledge_manager_select"
  on public.aura_ai_reply_knowledge;
create policy "aura_ai_reply_knowledge_manager_select"
on public.aura_ai_reply_knowledge for select to authenticated
using ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_knowledge_manager_insert"
  on public.aura_ai_reply_knowledge;
create policy "aura_ai_reply_knowledge_manager_insert"
on public.aura_ai_reply_knowledge for insert to authenticated
with check ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_knowledge_manager_update"
  on public.aura_ai_reply_knowledge;
create policy "aura_ai_reply_knowledge_manager_update"
on public.aura_ai_reply_knowledge for update to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

drop policy if exists "aura_ai_reply_knowledge_manager_delete"
  on public.aura_ai_reply_knowledge;
create policy "aura_ai_reply_knowledge_manager_delete"
on public.aura_ai_reply_knowledge for delete to authenticated
using ((select private.is_admin_or_staff()));

comment on table public.aura_ai_reply_examples is
  'Manager-approved SMS reply examples. The AI may use enabled rows as tone patterns, never as business facts.';
comment on table public.aura_ai_reply_feedback is
  'Immutable manager correction history for AI SMS drafts. Corrections become examples only with explicit approval.';
comment on table public.aura_ai_reply_knowledge is
  'Manager-reviewed business facts available to customer reply AI. Each fact retains its source path and can be disabled.';

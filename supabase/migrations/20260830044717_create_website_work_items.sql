create table if not exists public.website_work_items (
  id uuid primary key default gen_random_uuid(),
  task_key text not null unique check (task_key ~ '^[a-z0-9][a-z0-9_-]{2,79}$'),
  title text not null check (char_length(trim(title)) between 2 and 160),
  category text not null check (category in (
    'ai_communications',
    'documents_catalog',
    'requests_quotes',
    'suppliers_pricing',
    'carlos_focus',
    'website_ux',
    'integrations',
    'infrastructure'
  )),
  status text not null default 'open' check (status in (
    'open', 'in_progress', 'testing', 'ready', 'blocked',
    'completed', 'superseded', 'archived'
  )),
  assigned_agent text,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  summary text not null default '' check (char_length(summary) <= 500),
  next_step text not null default '' check (char_length(next_step) <= 500),
  source_chat_title text,
  source_chat_id uuid,
  priority integer not null default 3 check (priority between 1 and 5),
  sort_order integer not null default 0,
  latest_decision_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists website_work_items_board_idx
  on public.website_work_items (status, priority, category, sort_order, updated_at desc);

create or replace function private.set_website_work_items_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_website_work_items_updated_at on public.website_work_items;
create trigger set_website_work_items_updated_at
before update on public.website_work_items
for each row execute function private.set_website_work_items_updated_at();

alter table public.website_work_items enable row level security;
revoke all on table public.website_work_items from anon, authenticated;

comment on table public.website_work_items is
  'Canonical, deduplicated website delivery board. It is read only through the server-side PIN-gated manager page.';
comment on column public.website_work_items.source_chat_id is
  'Original Codex thread when the task came from a chat; the newest decision supersedes older wording.';

insert into public.website_work_items (
  task_key, title, category, status, assigned_agent, progress_percent,
  summary, next_step, source_chat_title, source_chat_id, priority, sort_order
)
values
  ('customer-sms-ai', 'Customer SMS AI replies', 'ai_communications', 'in_progress', 'Alex', 80,
   'Safe, short, conversation-aware customer replies with manager learning.',
   'Finish independent safety review, deploy, then run a long live SMS conversation.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 1, 10),
  ('sms-live-regression', 'Live SMS conversation test', 'ai_communications', 'testing', 'Maya', 35,
   'One real inbound and one AI reply were delivered without duplicates.',
   'Run the controlled multi-turn test after the reviewed AI release is live.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 1, 20),
  ('pdf-reviewed-lines-catalog', 'PDF reviewed lines to catalog', 'documents_catalog', 'ready', 'Daniel', 90,
   'Vendor, code, date, price, quantity, unit, total, page and source evidence are preserved.',
   'Apply the migration, deploy the release and verify the Firecode X document live.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 1, 10),
  ('production-domain-owner', 'Production domain release path', 'infrastructure', 'blocked', 'Root', 45,
   'The latest Vercel project is ready, but build.avantiap.com is attached to another Vercel owner.',
   'Identify the owning account or release through the production Git integration without moving DNS.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 1, 10),
  ('quo-webhook-cleanup', 'Quo webhook cleanup', 'integrations', 'open', 'Noam', 55,
   'The correct API webhook works; two rejected calls likely came from an older app-created webhook.',
   'Confirm and disable only the obsolete Quo UI webhook.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 2, 10),
  ('old-chat-audit', 'Audit and archive old website chats', 'infrastructure', 'in_progress', 'Noam', 35,
   'Open tasks are deduplicated and the newest instruction always wins.',
   'Continue the website-chat audit and archive each verified finished chat.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 2, 20),
  ('whatsapp-coexistence', 'WhatsApp Coexistence', 'integrations', 'blocked', 'External', 50,
   'Code exists, but the official Meta/2Chat connection has not been proven end to end.',
   'Complete the approved phone connection and verify one inbound and outbound message.',
   'Continue Avantia Build', '01a04998-7d0e-7a11-8cf5-5f8bc27b5463', 3, 20),
  ('abc-private-pricing', 'ABC Supply private pricing', 'suppliers_pricing', 'blocked', 'External', 70,
   'Catalog search works; private price needs the ABC sandbox customer, Ship-To and authorized branch.',
   'Complete ABC customer authorization and retry the exact price request.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 3, 30),
  ('learn-about-us-release', 'Learn About Us cinematic page', 'website_ux', 'open', 'Root', 65,
   'The cinematic page exists; the homepage redesign remains separate and must stay preview-only.',
   'Re-audit the latest instruction, media files and live navigation before publication.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 3, 10),
  ('media-messages-library', 'Media & Messages', 'website_ux', 'open', 'Root', 10,
   'One Manager Tools library for approved videos and the matching outreach message for each audience.',
   'Inventory approved media, preserve sources and versions, then add preview, copy and send actions.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 2, 20),
  ('website-work-board', 'Website work board', 'carlos_focus', 'in_progress', 'Root', 60,
   'Compact PIN-gated status table inside Carlos Focus.',
   'Finish mobile UI, tests, migration and live verification.',
   'new website chat', '01a03e75-97ec-7fa0-b7f4-f117dbac7584', 1, 5)
on conflict (task_key) do nothing;

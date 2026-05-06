create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'project_opened',
      'file_uploaded',
      'material_added',
      'quote_created',
      'quote_approved',
      'order_created',
      'whatsapp_message_received',
      'payment_requested',
      'status_changed',
      'note_added'
    )
  ),
  source text not null check (
    source in (
      'website',
      'upload',
      'materials',
      'quotes',
      'orders',
      'whatsapp',
      'admin',
      'payments',
      'system'
    )
  ),
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_events_project_id_idx on public.project_events(project_id);
create index if not exists project_events_owner_id_idx on public.project_events(owner_id);
create index if not exists project_events_event_type_idx on public.project_events(event_type);
create index if not exists project_events_source_idx on public.project_events(source);
create index if not exists project_events_created_at_idx on public.project_events(created_at);

alter table public.project_events enable row level security;

create policy "project_events_select_own"
on public.project_events
for select
using (auth.uid() = owner_id);

create policy "project_events_insert_own"
on public.project_events
for insert
with check (auth.uid() = owner_id);

create policy "project_events_update_own"
on public.project_events
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create table if not exists public.project_uploads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists project_uploads_project_id_idx on public.project_uploads(project_id);
create index if not exists project_uploads_owner_id_idx on public.project_uploads(owner_id);

alter table public.project_uploads enable row level security;

create policy "project_uploads_select_own"
on public.project_uploads
for select
using (auth.uid() = owner_id);

create policy "project_uploads_insert_own"
on public.project_uploads
for insert
with check (auth.uid() = owner_id);

create policy "project_uploads_update_own"
on public.project_uploads
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create table if not exists public.project_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid references public.project_uploads(id) on delete set null,
  name text not null,
  category text,
  quantity numeric,
  unit text,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_materials_project_id_idx on public.project_materials(project_id);
create index if not exists project_materials_owner_id_idx on public.project_materials(owner_id);
create index if not exists project_materials_upload_id_idx on public.project_materials(upload_id);

create or replace function public.set_project_materials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_materials_updated_at on public.project_materials;
create trigger set_project_materials_updated_at
before update on public.project_materials
for each row
execute function public.set_project_materials_updated_at();

alter table public.project_materials enable row level security;

create policy "project_materials_select_own"
on public.project_materials
for select
using (auth.uid() = owner_id);

create policy "project_materials_insert_own"
on public.project_materials
for insert
with check (auth.uid() = owner_id);

create policy "project_materials_update_own"
on public.project_materials
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

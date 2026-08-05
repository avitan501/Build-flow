create table if not exists public.project_questions (
  id text primary key,
  label text not null,
  question_type text not null default 'text' check (question_type in ('text', 'textarea', 'select', 'date', 'time')),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_question_answers (
  project_id uuid not null references public.projects(id) on delete cascade,
  question_id text not null references public.project_questions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, question_id)
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'quoted', 'closed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  catalog_item_id text,
  name text not null,
  department text not null,
  item_type text not null check (item_type in ('material', 'service', 'file_upload', 'custom_priced')),
  quantity numeric not null default 1 check (quantity > 0),
  unit text,
  unit_price numeric not null default 0 check (unit_price >= 0),
  qualification_status text not null default 'not_required' check (qualification_status in ('not_required', 'pending', 'answered', 'skipped')),
  answers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.quote_request_items(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_packages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  department text not null,
  supplier_id text,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'sent', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, department)
);

create table if not exists public.workflow_manager_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  state jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_question_answers_owner_idx on public.project_question_answers(owner_id);
create index if not exists quote_requests_project_idx on public.quote_requests(project_id, created_at desc);
create index if not exists quote_requests_owner_idx on public.quote_requests(owner_id, created_at desc);
create index if not exists quote_request_items_request_idx on public.quote_request_items(request_id, created_at);
create index if not exists quote_request_items_owner_idx on public.quote_request_items(owner_id);
create index if not exists quote_request_attachments_request_idx on public.quote_request_attachments(request_id, created_at);
create index if not exists quote_request_attachments_owner_idx on public.quote_request_attachments(owner_id);
create index if not exists supplier_packages_request_idx on public.supplier_packages(request_id);

create or replace function public.set_quote_workflow_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_questions_updated_at on public.project_questions;
create trigger set_project_questions_updated_at before update on public.project_questions
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_project_question_answers_updated_at on public.project_question_answers;
create trigger set_project_question_answers_updated_at before update on public.project_question_answers
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_quote_requests_updated_at on public.quote_requests;
create trigger set_quote_requests_updated_at before update on public.quote_requests
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_quote_request_items_updated_at on public.quote_request_items;
create trigger set_quote_request_items_updated_at before update on public.quote_request_items
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_supplier_packages_updated_at on public.supplier_packages;
create trigger set_supplier_packages_updated_at before update on public.supplier_packages
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_workflow_manager_settings_updated_at on public.workflow_manager_settings;
create trigger set_workflow_manager_settings_updated_at before update on public.workflow_manager_settings
for each row execute function public.set_quote_workflow_updated_at();

alter table public.project_questions enable row level security;
alter table public.project_question_answers enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_request_items enable row level security;
alter table public.quote_request_attachments enable row level security;
alter table public.supplier_packages enable row level security;
alter table public.workflow_manager_settings enable row level security;

create policy "project_questions_authenticated_read" on public.project_questions
for select to authenticated using (active or (select private.is_admin_or_staff()));
create policy "project_questions_admin_all" on public.project_questions
for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "project_question_answers_owner_read" on public.project_question_answers
for select to authenticated using ((select auth.uid()) = owner_id or (select private.is_admin_or_staff()));
create policy "project_question_answers_owner_insert" on public.project_question_answers
for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "project_question_answers_owner_update" on public.project_question_answers
for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "quote_requests_owner_read" on public.quote_requests
for select to authenticated using ((select auth.uid()) = owner_id or (select private.is_admin_or_staff()));
create policy "quote_requests_owner_insert" on public.quote_requests
for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "quote_requests_owner_update_draft" on public.quote_requests
for update to authenticated
using (((select auth.uid()) = owner_id and status = 'draft') or (select private.is_admin_or_staff()))
with check ((select auth.uid()) = owner_id or (select private.is_admin_or_staff()));

create policy "quote_request_items_owner_read" on public.quote_request_items
for select to authenticated using ((select auth.uid()) = owner_id or (select private.is_admin_or_staff()));
create policy "quote_request_items_owner_insert" on public.quote_request_items
for insert to authenticated with check (
  (select auth.uid()) = owner_id and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.owner_id = (select auth.uid()) and request.status = 'draft'
  )
);
create policy "quote_request_items_owner_update" on public.quote_request_items
for update to authenticated using (
  ((select auth.uid()) = owner_id and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.owner_id = (select auth.uid()) and request.status = 'draft'
  )) or (select private.is_admin_or_staff())
) with check ((select auth.uid()) = owner_id or (select private.is_admin_or_staff()));
create policy "quote_request_items_owner_delete" on public.quote_request_items
for delete to authenticated using (
  ((select auth.uid()) = owner_id and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.owner_id = (select auth.uid()) and request.status = 'draft'
  )) or (select private.is_admin_or_staff())
);

create policy "quote_request_attachments_owner_read" on public.quote_request_attachments
for select to authenticated using ((select auth.uid()) = owner_id or (select private.is_admin_or_staff()));
create policy "quote_request_attachments_owner_insert" on public.quote_request_attachments
for insert to authenticated with check (
  (select auth.uid()) = owner_id and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.owner_id = (select auth.uid()) and request.status = 'draft'
  )
);
create policy "quote_request_attachments_owner_delete" on public.quote_request_attachments
for delete to authenticated using (
  ((select auth.uid()) = owner_id and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.owner_id = (select auth.uid()) and request.status = 'draft'
  )) or (select private.is_admin_or_staff())
);

create policy "supplier_packages_admin_all" on public.supplier_packages
for all to authenticated using ((select private.is_admin_or_staff())) with check ((select private.is_admin_or_staff()));
create policy "workflow_manager_settings_authenticated_read" on public.workflow_manager_settings
for select to authenticated using (true);
create policy "workflow_manager_settings_admin_all" on public.workflow_manager_settings
for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.project_questions, public.workflow_manager_settings to authenticated;
grant select, insert, update on public.project_question_answers, public.quote_requests to authenticated;
grant select, insert, update, delete on public.quote_request_items, public.quote_request_attachments to authenticated;
grant select, insert, update, delete on public.supplier_packages to authenticated;
grant insert, update, delete on public.project_questions, public.workflow_manager_settings to authenticated;

insert into public.project_questions (id, label, question_type, required, sort_order)
values
  ('contact_person', 'Contact person on site', 'text', true, 10),
  ('gate_code', 'Gate or access code', 'text', false, 20),
  ('delivery_date', 'Preferred delivery date', 'date', false, 30),
  ('delivery_time', 'Preferred delivery time', 'time', false, 40),
  ('access_notes', 'Project access notes', 'textarea', false, 50)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-uploads',
  'project-uploads',
  false,
  26214400,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "project_upload_files_owner_read" on storage.objects
for select to authenticated using (bucket_id = 'project-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "project_upload_files_owner_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'project-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "project_upload_files_owner_update" on storage.objects
for update to authenticated using (bucket_id = 'project-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'project-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "project_upload_files_owner_delete" on storage.objects
for delete to authenticated using (bucket_id = 'project-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

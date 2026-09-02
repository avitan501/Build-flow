create table if not exists public.quote_comparison_client_attachments (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.quote_comparisons(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) between 1 and 180),
  file_path text not null unique check (char_length(trim(file_path)) between 1 and 800),
  file_type text not null check (
    file_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv'
    )
  ),
  file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists quote_comparison_client_attachments_comparison_idx
on public.quote_comparison_client_attachments(comparison_id, created_at);

alter table public.quote_comparison_client_attachments enable row level security;

create policy "quote_comparison_client_attachments_supplier_staff_all"
on public.quote_comparison_client_attachments for all to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = comparison_id
  )
)
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.quote_comparisons comparison
    where comparison.id = comparison_id
  )
);

revoke all on public.quote_comparison_client_attachments from anon, authenticated;
grant select, insert, delete on public.quote_comparison_client_attachments to authenticated;

alter table public.quote_comparison_client_deliveries
  add column if not exists attachments_snapshot jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachments_snapshot) = 'array');

update storage.buckets
set allowed_mime_types = array(
  select distinct mime_type
  from unnest(
    coalesce(allowed_mime_types, '{}'::text[])
    || array['image/heic', 'image/heif']::text[]
  ) as mime_type
)
where id = 'project-uploads';

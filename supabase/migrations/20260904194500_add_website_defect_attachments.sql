create table if not exists public.website_defect_attachments (
  id uuid primary key default gen_random_uuid(),
  defect_id uuid not null references public.website_defects(id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  storage_bucket text not null default 'website-defects' check (storage_bucket = 'website-defects'),
  file_name text not null check (char_length(file_name) between 1 and 240),
  file_path text not null unique check (char_length(file_path) between 10 and 1000),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm')),
  file_size bigint not null check (file_size between 1 and 104857600),
  created_at timestamptz not null default now(),
  unique (defect_id, position)
);

create index if not exists website_defect_attachments_defect_position_idx
  on public.website_defect_attachments (defect_id, position);

alter table public.website_defect_attachments enable row level security;
revoke all on table public.website_defect_attachments from anon, authenticated;
grant select, insert on table public.website_defect_attachments to authenticated;

create policy website_defect_attachments_staff_read
on public.website_defect_attachments for select to authenticated
using ((select private.is_admin()) or (select private.is_staff()));

create policy website_defect_attachments_reporter_insert
on public.website_defect_attachments for insert to authenticated
with check (
  ((select private.is_admin()) or (select private.is_staff()))
  and split_part(file_path, '/', 1) = (select auth.uid())::text
  and split_part(file_path, '/', 2) = defect_id::text
  and split_part(file_path, '/', 3) like lpad((position + 1)::text, 2, '0') || '-%'
  and exists (
    select 1
    from public.website_defects
    where website_defects.id = website_defect_attachments.defect_id
      and website_defects.created_by = (select auth.uid())
  )
);

create or replace function public.create_website_defect_batch(
  p_issue jsonb,
  p_attachments jsonb default '[]'::jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_defect_id uuid;
  v_issue_number bigint;
  v_primary_size bigint;
  v_extra_size bigint;
  v_attachment jsonb;
  v_position integer;
  v_path text;
begin
  if v_user_id is null or not (coalesce(private.is_admin(), false) or coalesce(private.is_staff(), false)) then
    raise exception 'Website Defects is available only to authorized staff.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_issue) <> 'object' or jsonb_typeof(p_attachments) <> 'array' then
    raise exception 'Invalid website defect manifest.' using errcode = '22023';
  end if;

  v_defect_id := (p_issue ->> 'id')::uuid;
  v_primary_size := (p_issue ->> 'file_size')::bigint;
  if jsonb_array_length(p_attachments) > 5
    or v_primary_size not between 1 and 104857600
    or p_issue ->> 'mime_type' not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm')
    or p_issue ->> 'file_path' not like v_user_id::text || '/' || v_defect_id::text || '/01-%'
  then
    raise exception 'Invalid website defect manifest.' using errcode = '22023';
  end if;

  select coalesce(sum((entry ->> 'file_size')::bigint), 0)
  into v_extra_size
  from jsonb_array_elements(p_attachments) as files(entry);
  if v_primary_size + v_extra_size > 262144000 then
    raise exception 'Website defect files exceed 250 MB.' using errcode = '22023';
  end if;

  for v_attachment in select value from jsonb_array_elements(p_attachments)
  loop
    v_position := (v_attachment ->> 'position')::integer;
    v_path := v_attachment ->> 'file_path';
    if v_position not between 1 and 5
      or (v_attachment ->> 'file_size')::bigint not between 1 and 104857600
      or v_attachment ->> 'mime_type' not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm')
      or v_path not like v_user_id::text || '/' || v_defect_id::text || '/' || lpad((v_position + 1)::text, 2, '0') || '-%'
    then
      raise exception 'Invalid website defect attachment.' using errcode = '22023';
    end if;
  end loop;

  insert into public.website_defects (
    id, title, description, page_url, status, priority,
    file_name, file_path, mime_type, file_size, assigned_to,
    created_by, updated_by
  ) values (
    v_defect_id,
    p_issue ->> 'title',
    coalesce(p_issue ->> 'description', ''),
    coalesce(p_issue ->> 'page_url', ''),
    'new',
    coalesce(p_issue ->> 'priority', 'normal'),
    p_issue ->> 'file_name',
    p_issue ->> 'file_path',
    p_issue ->> 'mime_type',
    v_primary_size,
    'Codex',
    v_user_id,
    v_user_id
  ) returning issue_number into v_issue_number;

  insert into public.website_defect_attachments (
    defect_id, position, storage_bucket, file_name, file_path, mime_type, file_size
  )
  select
    v_defect_id,
    (entry ->> 'position')::smallint,
    'website-defects',
    entry ->> 'file_name',
    entry ->> 'file_path',
    entry ->> 'mime_type',
    (entry ->> 'file_size')::bigint
  from jsonb_array_elements(p_attachments) as files(entry);

  return v_issue_number;
end;
$$;

revoke all on function public.create_website_defect_batch(jsonb, jsonb) from public, anon;
grant execute on function public.create_website_defect_batch(jsonb, jsonb) to authenticated;

comment on table public.website_defect_attachments is
  'Private extra recordings and screenshots attached to one Website Defects issue. The primary file remains on website_defects.';

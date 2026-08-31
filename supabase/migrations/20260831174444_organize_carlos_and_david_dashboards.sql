alter table public.website_work_items
  add column if not exists item_kind text not null default 'task'
    check (item_kind in ('task', 'pain')),
  add column if not exists published_to_carlos boolean not null default false;

create index if not exists website_work_items_carlos_published_idx
  on public.website_work_items (published_to_carlos, status, priority, sort_order)
  where published_to_carlos = true and item_kind = 'task';

drop policy if exists "website_work_items_staff_read" on public.website_work_items;
drop policy if exists "website_work_items_owner_manage" on public.website_work_items;
drop policy if exists "website_work_items_staff_published_read" on public.website_work_items;

create policy "website_work_items_owner_manage"
on public.website_work_items
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "website_work_items_staff_published_read"
on public.website_work_items
for select
to authenticated
using (
  (select private.is_staff())
  and published_to_carlos = true
  and item_kind = 'task'
);

grant select, insert, update, delete on table public.website_work_items to authenticated;

comment on column public.website_work_items.item_kind is
  'Separates David dashboard tasks from the private Pain I am Resolving list.';
comment on column public.website_work_items.published_to_carlos is
  'Owner-controlled visibility on Carlos Dashboard. Unchecked items remain private to David.';

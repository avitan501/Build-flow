drop policy if exists "website_work_items_owner_manage" on public.website_work_items;
drop policy if exists "website_work_items_staff_published_read" on public.website_work_items;

create policy "website_work_items_manager_read"
on public.website_work_items
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_staff())
    and published_to_carlos = true
    and item_kind = 'task'
  )
);

create policy "website_work_items_owner_insert"
on public.website_work_items
for insert
to authenticated
with check ((select private.is_admin()));

create policy "website_work_items_owner_update"
on public.website_work_items
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "website_work_items_owner_delete"
on public.website_work_items
for delete
to authenticated
using ((select private.is_admin()));

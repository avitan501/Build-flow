grant select on table public.website_work_items to authenticated;

drop policy if exists "website_work_items_staff_read" on public.website_work_items;
create policy "website_work_items_staff_read"
on public.website_work_items
for select
to authenticated
using ((select private.is_admin_or_staff()));

drop function if exists public.owner_read_site_traffic(timestamptz, integer);

drop policy if exists "site_page_views_owner_read" on public.site_page_views;
create policy "site_page_views_owner_read"
on public.site_page_views
for select
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'avitanneto@gmail.com'
  and (select private.is_admin())
);

grant select on public.site_page_views to authenticated;

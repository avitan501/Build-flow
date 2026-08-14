create or replace function public.owner_read_site_traffic(
  p_since timestamptz,
  p_limit integer default 10000
)
returns table (
  path text,
  referrer_host text,
  session_hash text,
  device_class text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and lower(trim(profile.email)) = 'avitanneto@gmail.com'
      and profile.role = 'admin'
      and profile.approval_status = 'approved'
      and profile.is_active = true
  ) then
    raise insufficient_privilege using message = 'owner_access_required';
  end if;

  return query
  select
    traffic_view.path,
    traffic_view.referrer_host,
    traffic_view.session_hash,
    traffic_view.device_class,
    traffic_view.created_at
  from public.site_page_views traffic_view
  where traffic_view.created_at >= greatest(
    coalesce(p_since, now() - interval '30 days'),
    now() - interval '90 days'
  )
  order by traffic_view.created_at desc
  limit least(greatest(coalesce(p_limit, 10000), 1), 10000);
end;
$$;

revoke all on function public.owner_read_site_traffic(timestamptz, integer) from public, anon;
grant execute on function public.owner_read_site_traffic(timestamptz, integer) to authenticated;

create or replace function public.record_site_page_view(
  p_path text,
  p_referrer_host text,
  p_session_hash text,
  p_device_class text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_path is null
    or char_length(p_path) > 300
    or p_path !~ '^/'
    or p_path ~ '^/(admin|api)(/|$)'
    or p_session_hash !~ '^[0-9a-f]{32}$'
    or p_device_class not in ('mobile', 'desktop')
  then
    return;
  end if;

  if exists (
    select 1
    from public.site_page_views
    where session_hash = p_session_hash
      and path = p_path
      and created_at > now() - interval '30 seconds'
  ) then
    return;
  end if;

  insert into public.site_page_views (path, referrer_host, session_hash, device_class)
  values (p_path, nullif(left(trim(p_referrer_host), 255), ''), p_session_hash, p_device_class);
end;
$$;

revoke all on function public.record_site_page_view(text, text, text, text) from public;
grant execute on function public.record_site_page_view(text, text, text, text) to anon, authenticated;

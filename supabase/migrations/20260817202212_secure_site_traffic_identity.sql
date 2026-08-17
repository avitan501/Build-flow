create table if not exists private.site_traffic_ingest_config (
  id boolean primary key default true check (id),
  ingest_secret text not null check (char_length(ingest_secret) >= 32),
  updated_at timestamptz not null default now()
);

revoke all on private.site_traffic_ingest_config from public, anon, authenticated;

alter table public.site_page_views
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists site_page_views_user_created_at_idx
  on public.site_page_views (user_id, created_at desc)
  where user_id is not null;

create or replace function public.record_site_page_view(
  p_path text,
  p_referrer_host text,
  p_session_hash text,
  p_device_class text,
  p_city text,
  p_region text,
  p_country text,
  p_user_id uuid,
  p_ingest_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_user_id uuid;
begin
  if not exists (
    select 1
    from private.site_traffic_ingest_config config
    where config.id = true
      and config.ingest_secret = p_ingest_secret
  ) then
    raise insufficient_privilege using message = 'invalid_traffic_ingest_secret';
  end if;

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
    from public.site_page_views traffic_view
    where traffic_view.session_hash = p_session_hash
      and traffic_view.path = p_path
      and traffic_view.created_at > now() - interval '30 seconds'
  ) then
    return;
  end if;

  select auth_user.id
  into safe_user_id
  from auth.users auth_user
  where auth_user.id = p_user_id;

  insert into public.site_page_views (
    path,
    referrer_host,
    session_hash,
    device_class,
    city,
    region,
    country,
    user_id
  )
  values (
    p_path,
    nullif(left(trim(p_referrer_host), 255), ''),
    p_session_hash,
    p_device_class,
    nullif(left(trim(p_city), 120), ''),
    nullif(left(trim(p_region), 120), ''),
    nullif(left(trim(p_country), 2), ''),
    safe_user_id
  );
end;
$$;

revoke all on function public.record_site_page_view(text, text, text, text, text, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_site_page_view(text, text, text, text, text, text, text, uuid, text)
  to anon, authenticated;

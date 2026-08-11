create table if not exists public.site_page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) between 1 and 300),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  session_hash text not null check (char_length(session_hash) = 32),
  device_class text not null check (device_class in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);

create index if not exists site_page_views_created_at_idx on public.site_page_views (created_at desc);
create index if not exists site_page_views_path_created_at_idx on public.site_page_views (path, created_at desc);
create index if not exists site_page_views_session_created_at_idx on public.site_page_views (session_hash, created_at desc);

alter table public.site_page_views enable row level security;
revoke all on table public.site_page_views from anon, authenticated;

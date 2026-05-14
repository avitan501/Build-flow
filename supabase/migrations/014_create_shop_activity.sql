create table if not exists public.shop_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  event_type text not null check (event_type in ('search', 'product_view', 'category_select', 'add_to_cart')),
  query text,
  product_slug text,
  product_name text,
  category text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists shop_activity_user_created_idx on public.shop_activity(user_id, created_at desc);
create index if not exists shop_activity_session_created_idx on public.shop_activity(session_id, created_at desc);
create index if not exists shop_activity_event_type_idx on public.shop_activity(event_type, created_at desc);

alter table public.shop_activity enable row level security;

create policy "shop_activity_select_own"
on public.shop_activity
for select
using (auth.uid() = user_id);

create policy "shop_activity_insert_own"
on public.shop_activity
for insert
with check (auth.uid() = user_id);

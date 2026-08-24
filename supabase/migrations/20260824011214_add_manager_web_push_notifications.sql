create table if not exists public.manager_push_config (
  id text primary key check (id = 'primary'),
  public_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manager_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_name text not null default 'This device',
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manager_push_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_orders boolean not null default true,
  calls_and_messages boolean not null default true,
  supplier_updates boolean not null default true,
  quote_approvals boolean not null default true,
  delivery_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.manager_push_notification_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('new_order', 'call_message', 'supplier_update', 'quote_approval', 'delivery_update', 'test')),
  title text not null,
  body text not null,
  href text not null,
  delivered_count integer not null default 0 check (delivered_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists manager_push_subscriptions_user_id_idx
  on public.manager_push_subscriptions(user_id);
create index if not exists manager_push_notification_log_created_at_idx
  on public.manager_push_notification_log(created_at desc);

alter table public.manager_push_config enable row level security;
alter table public.manager_push_subscriptions enable row level security;
alter table public.manager_push_preferences enable row level security;
alter table public.manager_push_notification_log enable row level security;

revoke all on table public.manager_push_config from anon, authenticated;
revoke all on table public.manager_push_subscriptions from anon, authenticated;
revoke all on table public.manager_push_preferences from anon, authenticated;
revoke all on table public.manager_push_notification_log from anon, authenticated;

create or replace function public.initialize_manager_web_push(
  p_public_key text,
  p_private_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_public_key text;
  existing_secret_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('avantia-manager-web-push'));

  select public_key into existing_public_key
  from public.manager_push_config
  where id = 'primary';

  if existing_public_key is not null then
    return existing_public_key;
  end if;

  if nullif(trim(p_public_key), '') is null or nullif(trim(p_private_key), '') is null then
    raise exception 'Push keys are required.';
  end if;

  select id into existing_secret_id
  from vault.secrets
  where name = 'manager_web_push_private_key'
  limit 1;

  if existing_secret_id is null then
    perform vault.create_secret(
      p_private_key,
      'manager_web_push_private_key',
      'Avantia Build manager Web Push VAPID private key'
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      p_private_key,
      'manager_web_push_private_key',
      'Avantia Build manager Web Push VAPID private key'
    );
  end if;

  insert into public.manager_push_config (id, public_key)
  values ('primary', p_public_key);

  return p_public_key;
end;
$$;

create or replace function public.get_manager_web_push_private_key()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'manager_web_push_private_key'
  limit 1;
$$;

revoke all on function public.initialize_manager_web_push(text, text) from public, anon, authenticated;
revoke all on function public.get_manager_web_push_private_key() from public, anon, authenticated;
grant execute on function public.initialize_manager_web_push(text, text) to service_role;
grant execute on function public.get_manager_web_push_private_key() to service_role;

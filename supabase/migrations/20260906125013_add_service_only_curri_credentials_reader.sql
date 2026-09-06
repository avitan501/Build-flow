create or replace function public.get_curri_credentials()
returns table (
  user_id text,
  api_key text,
  account_id text,
  account_location text
)
language sql
security definer
set search_path = ''
as $$
  select
    max(secret.decrypted_secret) filter (where secret.name = 'curri_user_id'),
    max(secret.decrypted_secret) filter (where secret.name = 'curri_api_key'),
    max(secret.decrypted_secret) filter (where secret.name = 'curri_account_id'),
    max(secret.decrypted_secret) filter (where secret.name = 'curri_account_location')
  from vault.decrypted_secrets as secret
  where secret.name in ('curri_user_id', 'curri_api_key', 'curri_account_id', 'curri_account_location')
  having count(*) filter (where secret.name in ('curri_user_id', 'curri_api_key')) = 2;
$$;

revoke all on function public.get_curri_credentials() from public;
revoke all on function public.get_curri_credentials() from anon;
revoke all on function public.get_curri_credentials() from authenticated;
grant execute on function public.get_curri_credentials() to service_role;

create table if not exists public.delivery_booking_locks (
  task_id uuid primary key references public.aura_tasks(id) on delete cascade,
  provider text not null check (provider in ('Uber Direct', 'Curri')),
  status text not null default 'booking' check (status in ('booking', 'accepted', 'uncertain')),
  provider_delivery_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_booking_locks enable row level security;
create unique index if not exists delivery_booking_locks_provider_delivery_id_idx
  on public.delivery_booking_locks(provider, provider_delivery_id)
  where provider_delivery_id is not null;
revoke all on table public.delivery_booking_locks from public, anon, authenticated;
grant select, insert, update on table public.delivery_booking_locks to service_role;

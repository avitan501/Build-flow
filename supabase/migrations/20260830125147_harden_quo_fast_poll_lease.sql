create table if not exists private.aura_worker_leases (
  lease_name text primary key,
  lease_token uuid not null,
  lease_until timestamptz not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.aura_worker_leases from public, anon, authenticated;

create or replace function private.claim_quo_fast_poll_lease(p_ttl_seconds integer default 180)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_token uuid := extensions.gen_random_uuid();
  claimed_token uuid;
begin
  if p_ttl_seconds < 60 or p_ttl_seconds > 600 then
    return null;
  end if;

  insert into private.aura_worker_leases (lease_name, lease_token, lease_until, updated_at)
  values (
    'quo-fast-poll',
    candidate_token,
    clock_timestamp() + make_interval(secs => p_ttl_seconds),
    clock_timestamp()
  )
  on conflict (lease_name) do update
    set lease_token = excluded.lease_token,
        lease_until = excluded.lease_until,
        updated_at = excluded.updated_at
    where private.aura_worker_leases.lease_until <= clock_timestamp()
  returning lease_token into claimed_token;

  return claimed_token;
end;
$$;

create or replace function private.renew_quo_fast_poll_lease(
  p_lease_token uuid,
  p_ttl_seconds integer default 180
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lease_token is null or p_ttl_seconds < 60 or p_ttl_seconds > 600 then
    return false;
  end if;

  update private.aura_worker_leases
  set lease_until = clock_timestamp() + make_interval(secs => p_ttl_seconds),
      updated_at = clock_timestamp()
  where lease_name = 'quo-fast-poll'
    and lease_token = p_lease_token
    and lease_until > clock_timestamp();

  return found;
end;
$$;

create or replace function private.release_quo_fast_poll_lease(p_lease_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lease_token is null then return false; end if;

  delete from private.aura_worker_leases
  where lease_name = 'quo-fast-poll'
    and lease_token = p_lease_token;

  return found;
end;
$$;

revoke all on function private.claim_quo_fast_poll_lease(integer) from public, anon, authenticated;
revoke all on function private.renew_quo_fast_poll_lease(uuid, integer) from public, anon, authenticated;
revoke all on function private.release_quo_fast_poll_lease(uuid) from public, anon, authenticated;

comment on table private.aura_worker_leases is
  'Private database-backed leases that prevent overlapping background worker windows.';
comment on function private.claim_quo_fast_poll_lease(integer) is
  'Atomically claims the singleton Quo fast-poll lease, or returns null while another window owns it.';

-- Durable, coalescing material-list processing. The application only waits for
-- enqueue; pg_cron and an Edge worker finish the document work independently.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.client_material_list_jobs (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  generation bigint not null default 1 check (generation > 0),
  force_requested boolean not null default false,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'retrying', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  result_status text check (result_status is null or char_length(result_status) <= 80),
  item_count integer check (item_count is null or item_count >= 0),
  review_count integer check (review_count is null or review_count >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id)
);

comment on table public.client_material_list_jobs is
  'Durable and idempotent material-list AI jobs. One row per request coalesces repeated attachment changes by generation.';

create index if not exists client_material_list_jobs_ready_idx
  on public.client_material_list_jobs(status, available_at, id)
  where status in ('queued', 'processing', 'retrying');

alter table public.client_material_list_jobs enable row level security;
revoke all on table public.client_material_list_jobs from public, anon, authenticated;
revoke all on sequence public.client_material_list_jobs_id_seq from public, anon, authenticated;
grant all on table public.client_material_list_jobs to service_role;
grant usage, select on sequence public.client_material_list_jobs_id_seq to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'client_material_list_dispatch_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'client_material_list_dispatch_secret',
      'Authenticates the scheduled material-list worker'
    );
  end if;
end;
$$;

create or replace function public.get_client_material_list_dispatch_secret()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'client_material_list_dispatch_secret'
  limit 1;
$$;

revoke all on function public.get_client_material_list_dispatch_secret() from public, anon, authenticated;
grant execute on function public.get_client_material_list_dispatch_secret() to service_role;

create or replace function public.enqueue_client_material_list_job(
  p_request_id uuid,
  p_force boolean default false
)
returns table (job_id bigint, generation bigint, job_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id bigint;
  v_generation bigint;
  v_status text;
begin
  if not exists (select 1 from public.quote_requests where id = p_request_id) then
    raise exception 'request_not_found';
  end if;

  insert into public.client_material_list_jobs (
    request_id,
    force_requested,
    status
  ) values (
    p_request_id,
    coalesce(p_force, false),
    'queued'
  )
  on conflict (request_id) do update
  set generation = public.client_material_list_jobs.generation + 1,
      force_requested = public.client_material_list_jobs.force_requested or excluded.force_requested,
      status = case
        when public.client_material_list_jobs.status = 'processing' then 'processing'
        else 'queued'
      end,
      attempts = case
        when public.client_material_list_jobs.status = 'processing' then public.client_material_list_jobs.attempts
        else 0
      end,
      available_at = now(),
      completed_at = null,
      result_status = null,
      item_count = null,
      review_count = null,
      last_error = null,
      updated_at = now()
  returning id, public.client_material_list_jobs.generation, status
  into v_job_id, v_generation, v_status;

  update public.quote_request_items
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'ai_organization_status', case when v_status = 'processing' then 'processing' else 'queued' end,
        'ai_organization_job_status', v_status,
        'ai_organization_generation', v_generation,
        'ai_organization_queued_at', now()
      )
  where id = (
    select item.id
    from public.quote_request_items as item
    where item.request_id = p_request_id
      and coalesce(item.metadata ->> 'ai_organized', 'false') <> 'true'
    order by item.created_at, item.id
    limit 1
  );

  return query select v_job_id, v_generation, v_status;
end;
$$;

revoke all on function public.enqueue_client_material_list_job(uuid, boolean) from public, anon, authenticated;
grant execute on function public.enqueue_client_material_list_job(uuid, boolean) to service_role;

create or replace function public.claim_client_material_list_jobs(p_limit integer default 1)
returns table (
  job_id bigint,
  request_id uuid,
  generation bigint,
  force_requested boolean,
  attempt integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select job.id
    from public.client_material_list_jobs as job
    where job.attempts < job.max_attempts
      and (
        (job.status in ('queued', 'retrying') and job.available_at <= now())
        or (job.status = 'processing' and job.locked_at < now() - interval '6 minutes')
      )
    order by job.available_at, job.id
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 3)
  ), claimed as (
    update public.client_material_list_jobs as job
    set status = 'processing',
        attempts = job.attempts + 1,
        locked_at = now(),
        available_at = now() + interval '6 minutes',
        updated_at = now()
    from candidates
    where job.id = candidates.id
    returning job.id, job.request_id, job.generation, job.force_requested, job.attempts
  ), marked as (
    update public.quote_request_items as item
    set metadata = coalesce(item.metadata, '{}'::jsonb) || jsonb_build_object(
          'ai_organization_job_status', 'processing',
          'ai_organization_attempts', claimed.attempts,
          'ai_organization_generation', claimed.generation
        )
    from claimed
    where item.id = (
      select source.id
      from public.quote_request_items as source
      where source.request_id = claimed.request_id
        and coalesce(source.metadata ->> 'ai_organized', 'false') <> 'true'
      order by source.created_at, source.id
      limit 1
    )
    returning claimed.id
  )
  select claimed.id, claimed.request_id, claimed.generation, claimed.force_requested, claimed.attempts
  from claimed
  left join marked on marked.id = claimed.id;
end;
$$;

revoke all on function public.claim_client_material_list_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_client_material_list_jobs(integer) to service_role;

create or replace function public.finish_client_material_list_job(
  p_job_id bigint,
  p_generation bigint,
  p_succeeded boolean,
  p_result_status text default null,
  p_item_count integer default null,
  p_review_count integer default null,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.client_material_list_jobs%rowtype;
  v_status text;
  v_available_at timestamptz;
begin
  select * into v_job
  from public.client_material_list_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then return 'missing'; end if;

  if v_job.generation <> p_generation then
    v_status := 'queued';
    v_available_at := now();
    update public.client_material_list_jobs
    set status = v_status,
        attempts = 0,
        available_at = v_available_at,
        locked_at = null,
        last_error = null,
        updated_at = now()
    where id = p_job_id;
  elsif coalesce(p_succeeded, false) then
    v_status := 'completed';
    update public.client_material_list_jobs
    set status = v_status,
        force_requested = false,
        locked_at = null,
        completed_at = now(),
        result_status = left(coalesce(p_result_status, 'organized'), 80),
        item_count = greatest(coalesce(p_item_count, 0), 0),
        review_count = greatest(coalesce(p_review_count, 0), 0),
        last_error = null,
        updated_at = now()
    where id = p_job_id;
  elsif v_job.attempts < v_job.max_attempts then
    v_status := 'retrying';
    v_available_at := now() + make_interval(
      mins => least(15, power(2, greatest(v_job.attempts - 1, 0))::integer)
    );
    update public.client_material_list_jobs
    set status = v_status,
        available_at = v_available_at,
        locked_at = null,
        last_error = left(coalesce(nullif(p_error, ''), 'organizer_failed'), 240),
        updated_at = now()
    where id = p_job_id;
  else
    v_status := 'failed';
    update public.client_material_list_jobs
    set status = v_status,
        locked_at = null,
        completed_at = now(),
        last_error = left(coalesce(nullif(p_error, ''), 'organizer_failed'), 240),
        updated_at = now()
    where id = p_job_id;
  end if;

  update public.quote_request_items
  set metadata = coalesce(metadata, '{}'::jsonb) ||
    case
      when v_status = 'completed' then jsonb_build_object(
        'ai_organization_job_status', v_status,
        'ai_organization_attempts', v_job.attempts,
        'ai_organization_generation', v_job.generation
      )
      when v_status = 'retrying' then jsonb_build_object(
        'ai_organization_status', v_status,
        'ai_organization_job_status', v_status,
        'ai_organization_attempts', v_job.attempts,
        'ai_organization_generation', v_job.generation,
        'ai_organization_next_retry_at', v_available_at,
        'ai_organization_error', 'temporary_failure'
      )
      when v_status = 'failed' then jsonb_build_object(
        'ai_organization_status', v_status,
        'ai_organization_job_status', v_status,
        'ai_organization_attempts', v_job.attempts,
        'ai_organization_generation', v_job.generation,
        'ai_organization_error', 'automatic_processing_failed'
      )
      else jsonb_build_object(
        'ai_organization_status', 'queued',
        'ai_organization_job_status', 'queued',
        'ai_organization_attempts', 0,
        'ai_organization_generation', v_job.generation,
        'ai_organization_queued_at', now()
      )
    end
  where id = (
    select item.id
    from public.quote_request_items as item
    where item.request_id = v_job.request_id
      and coalesce(item.metadata ->> 'ai_organized', 'false') <> 'true'
    order by item.created_at, item.id
    limit 1
  );

  return v_status;
end;
$$;

revoke all on function public.finish_client_material_list_job(bigint, bigint, boolean, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.finish_client_material_list_job(bigint, bigint, boolean, text, integer, integer, text) to service_role;

create or replace function public.dispatch_client_material_list_jobs()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  dispatch_secret text;
  request_id bigint;
begin
  if not exists (
    select 1 from public.client_material_list_jobs
    where status in ('queued', 'retrying', 'processing')
      and attempts < max_attempts
      and (available_at <= now() or locked_at < now() - interval '6 minutes')
  ) then return null; end if;

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'client_material_list_dispatch_secret'
  limit 1;

  if project_url is null or dispatch_secret is null then return null; end if;
  if project_url <> 'https://nprfhspwdflpqlopydmp.supabase.co' then return null; end if;

  select net.http_post(
    url := project_url || '/functions/v1/client-material-list-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Client-Material-Dispatch', dispatch_secret
    ),
    body := jsonb_build_object('action', 'drain'),
    timeout_milliseconds := 55000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_client_material_list_jobs() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'dispatch-client-material-list-jobs') then
    perform cron.schedule(
      'dispatch-client-material-list-jobs',
      '* * * * *',
      'select public.dispatch_client_material_list_jobs();'
    );
  end if;
end;
$$;

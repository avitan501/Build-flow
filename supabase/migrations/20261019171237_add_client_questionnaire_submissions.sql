-- Independent, immutable client submissions. Existing owner-led interviews are untouched.
create table public.client_questionnaire_submissions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  state jsonb not null check (
    jsonb_typeof(state) = 'object'
    and state @> '{"type":"avantia-client-questionnaire-v1","consent":true}'::jsonb
    and octet_length(state::text) <= 100000
  ),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  rate_bucket text not null check (rate_bucket ~ '^[a-f0-9]{64}$')
);
alter table public.client_questionnaire_submissions enable row level security;
revoke all on public.client_questionnaire_submissions from public, anon, authenticated, service_role;
grant select, insert on public.client_questionnaire_submissions to service_role;
create index client_questionnaire_recent_idx on public.client_questionnaire_submissions (created_at desc, id);
create index client_questionnaire_bucket_idx on public.client_questionnaire_submissions (rate_bucket);

create function public.submit_client_questionnaire(p_id uuid, p_state jsonb, p_content_hash text, p_bucket text)
returns text language plpgsql security invoker set search_path = '' as $$
declare existing_hash text;
begin
  -- Serialize retries and per-day pseudonymous network quotas across app instances.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 19));
  select content_hash into existing_hash from public.client_questionnaire_submissions where id = p_id;
  if found then
    if existing_hash = p_content_hash then return 'duplicate'; else return 'conflict'; end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_bucket, 29));
  if (select count(*) from public.client_questionnaire_submissions where rate_bucket = p_bucket) >= 5 then return 'limited'; end if;
  insert into public.client_questionnaire_submissions(id,state,content_hash,rate_bucket)
    values(p_id,p_state,p_content_hash,p_bucket);
  return 'saved';
end;
$$;
revoke all on function public.submit_client_questionnaire(uuid,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.submit_client_questionnaire(uuid,jsonb,text,text) to service_role;
comment on table public.client_questionnaire_submissions is 'Client-submitted discovery answers only. Private owner inbox via server authorization; no public reads. No raw IP address stored.';

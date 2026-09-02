create table if not exists private.staff_client_request_submissions (
  idempotency_key uuid primary key,
  actor_user_id uuid not null,
  request_id uuid unique references public.quote_requests(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on table private.staff_client_request_submissions from public, anon, authenticated;

create or replace function public.staff_create_client_request_once(
  p_idempotency_key uuid,
  p_customer_id uuid,
  p_department text,
  p_title text,
  p_lines jsonb,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  reserved boolean := false;
  prior_actor_id uuid;
  result_request_id uuid;
begin
  if actor_id is null then raise exception 'authentication_required'; end if;

  insert into private.staff_client_request_submissions (idempotency_key, actor_user_id)
  values (p_idempotency_key, actor_id)
  on conflict (idempotency_key) do nothing
  returning true into reserved;

  if not coalesce(reserved, false) then
    select submission.actor_user_id, submission.request_id
    into prior_actor_id, result_request_id
    from private.staff_client_request_submissions submission
    where submission.idempotency_key = p_idempotency_key;

    if prior_actor_id is distinct from actor_id then raise exception 'idempotency_key_conflict'; end if;
    if result_request_id is null then raise exception 'request_creation_in_progress'; end if;
    return result_request_id;
  end if;

  result_request_id := public.staff_create_client_request(
    p_customer_id,
    p_department,
    p_title,
    p_lines,
    p_notes
  );

  update private.staff_client_request_submissions
  set request_id = result_request_id
  where idempotency_key = p_idempotency_key and actor_user_id = actor_id;

  return result_request_id;
end;
$$;

revoke all on function public.staff_create_client_request_once(uuid, uuid, text, text, jsonb, text)
  from public, anon;
grant execute on function public.staff_create_client_request_once(uuid, uuid, text, text, jsonb, text)
  to authenticated;

create or replace function public.staff_load_aura_communication_history_page(
  p_before_occurred_at timestamptz default null,
  p_before_id uuid default null,
  p_page_size integer default 80,
  p_channel text default null,
  p_phone text default null,
  p_email text default null,
  p_query text default null
)
returns table (
  id uuid,
  contact_id uuid,
  provider text,
  channel text,
  direction text,
  counterparty_phone text,
  counterparty_email text,
  subject text,
  body text,
  summary text,
  transcript text,
  next_steps jsonb,
  media jsonb,
  status text,
  duration_seconds integer,
  occurred_at timestamptz,
  last_event_at timestamptz,
  mailbox_address text,
  message_id text,
  in_reply_to text,
  read_at timestamptz,
  links jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not (select private.has_staff_capability('customers'))
     and not (select private.is_admin()) then
    raise exception 'customer_management_permission_required';
  end if;

  return query
  select
    communication.id,
    communication.contact_id,
    communication.provider,
    communication.channel,
    communication.direction,
    communication.counterparty_phone,
    communication.counterparty_email,
    communication.subject,
    communication.body,
    communication.summary,
    communication.transcript,
    communication.next_steps,
    communication.media,
    communication.status,
    communication.duration_seconds,
    communication.occurred_at,
    communication.last_event_at,
    communication.mailbox_address,
    communication.message_id,
    communication.in_reply_to,
    communication.read_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'communication_id', link.communication_id,
        'entity_type', link.entity_type,
        'entity_id', link.entity_id,
        'entity_label', link.entity_label,
        'link_source', link.link_source,
        'confidence', link.confidence
      ) order by link.created_at)
      from public.aura_communication_links as link
      where link.communication_id = communication.id
    ), '[]'::jsonb) as links
  from public.aura_communications as communication
  where communication.channel in ('sms', 'whatsapp', 'email', 'call')
    and (p_channel is null or communication.channel = p_channel)
    and (
      (p_before_occurred_at is null and p_before_id is null)
      or (
        p_before_occurred_at is not null
        and p_before_id is not null
        and (communication.occurred_at, communication.id) < (p_before_occurred_at, p_before_id)
      )
    )
    and (
      (p_phone is null and p_email is null)
      or (p_phone is not null and communication.counterparty_phone = p_phone)
      or (p_email is not null and lower(communication.counterparty_email) = lower(p_email))
    )
    and (
      p_query is null
      or communication.counterparty_phone ilike '%' || p_query || '%'
      or communication.counterparty_email ilike '%' || p_query || '%'
      or communication.subject ilike '%' || p_query || '%'
      or communication.body ilike '%' || p_query || '%'
      or communication.summary ilike '%' || p_query || '%'
      or communication.transcript ilike '%' || p_query || '%'
    )
  order by communication.occurred_at desc, communication.id desc
  limit least(greatest(coalesce(p_page_size, 80), 1), 100) + 1;
end;
$$;

revoke all on function public.staff_load_aura_communication_history_page(
  timestamptz, uuid, integer, text, text, text, text
) from public, anon;
grant execute on function public.staff_load_aura_communication_history_page(
  timestamptz, uuid, integer, text, text, text, text
) to authenticated, service_role;

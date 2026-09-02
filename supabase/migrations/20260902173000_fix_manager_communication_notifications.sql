-- Keep manager communication alerts private, deduplicated, and retryable.

create or replace function public.claim_manager_push_events(p_limit integer default 25)
returns table (
  id bigint,
  event_type text,
  title text,
  body text,
  href text,
  tag text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    select queue.id
    from public.manager_push_queue as queue
    where queue.processed_at is null
      and queue.attempts < 5
      and queue.available_at <= now()
    order by queue.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  ), updated as (
    update public.manager_push_queue as queue
    set attempts = queue.attempts + 1,
        available_at = now() + make_interval(
          mins => least(30, greatest(1, power(2, queue.attempts)::integer))
        )
    from claimed
    where queue.id = claimed.id
    returning queue.id, queue.event_type, queue.title, queue.body, queue.href, queue.tag
  )
  select updated.id, updated.event_type, updated.title, updated.body, updated.href, updated.tag
  from updated;
end;
$$;

revoke all on function public.claim_manager_push_events(integer) from public, anon, authenticated;
grant execute on function public.claim_manager_push_events(integer) to service_role;

grant execute on function public.queue_manager_push_event(text, text, text, text, text, text) to service_role;

create or replace function public.queue_inbound_communication_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_label text;
begin
  if new.direction <> 'incoming' then return new; end if;
  channel_label := case
    when new.channel = 'call' then 'call'
    when new.channel = 'whatsapp' then 'WhatsApp message'
    when new.channel = 'sms' then 'text message'
    when new.channel = 'email' then 'email'
    else 'message'
  end;
  perform public.queue_manager_push_event(
    'call_message',
    'New ' || channel_label,
    'Open Communications to review and respond.',
    case
      when new.channel in ('call', 'sms', 'whatsapp', 'email')
        then '/admin/communications?channel=' || new.channel ||
          case
            when coalesce(new.counterparty_phone, new.counterparty_email) is not null
              then '&q=' || replace(coalesce(new.counterparty_phone, new.counterparty_email), '+', '%2B')
            else ''
          end
      else '/admin/communications'
    end,
    'call_message:' || new.id::text,
    'avantia-communication-' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists aura_communications_manager_push on public.aura_communications;
create trigger aura_communications_manager_push
after insert on public.aura_communications
for each row execute function public.queue_inbound_communication_push();

revoke all on function public.queue_inbound_communication_push() from public, anon, authenticated;

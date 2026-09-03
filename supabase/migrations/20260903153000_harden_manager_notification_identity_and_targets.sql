-- Keep manager communication alerts identifiable and directly actionable.
-- The exact, ambiguity-safe party resolver is installed by the earlier
-- resolve_manager_caller_identity migration and must not be weakened here.

create or replace function public.queue_inbound_communication_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  party_label text;
  event_title text;
  event_body text;
  exact_href text;
  status_label text := lower(trim(coalesce(new.status, '')));
  old_status_label text := '';
  is_missed_call boolean;
  was_missed_call boolean := false;
begin
  if lower(coalesce(new.direction, '')) not in ('incoming', 'inbound') then return new; end if;

  is_missed_call := new.channel = 'call' and status_label in (
    'missed', 'no-answer', 'no_answer', 'not-answered', 'unanswered', 'busy', 'declined'
  );
  if tg_op = 'UPDATE' then
    old_status_label := lower(trim(coalesce(old.status, '')));
    was_missed_call := old.channel = 'call' and old_status_label in (
      'missed', 'no-answer', 'no_answer', 'not-answered', 'unanswered', 'busy', 'declined'
    );
    if not is_missed_call or was_missed_call then return new; end if;
  end if;

  party_label := private.manager_notification_party_label(
    new.contact_id,
    new.counterparty_phone,
    new.counterparty_email,
    new.channel
  );
  exact_href := '/admin/communications?communication=' || new.id::text ||
    '&channel=' || case
      when new.channel in ('call', 'sms', 'whatsapp', 'email') then new.channel
      else 'all'
    end;

  if is_missed_call then
    event_title := 'Missed call from ' || party_label;
    event_body := coalesce(
      nullif(regexp_replace(coalesce(new.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(new.transcript, ''), '\s+', ' ', 'g'), ''),
      'No answer. Tap to review the call and follow up.'
    );
  elsif new.channel = 'call' then
    event_title := 'Incoming call from ' || party_label;
    event_body := coalesce(
      nullif(regexp_replace(coalesce(new.summary, ''), '\s+', ' ', 'g'), ''),
      'Tap to open the call record.'
    );
  elsif new.channel = 'email' then
    event_title := 'Email from ' || party_label;
    event_body := coalesce(
      nullif('Subject: ' || trim(coalesce(new.subject, '')), 'Subject: '),
      nullif(regexp_replace(coalesce(new.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to read the email.'
    );
  elsif new.channel = 'whatsapp' then
    event_title := 'WhatsApp from ' || party_label;
    event_body := coalesce(
      nullif(regexp_replace(coalesce(new.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to read the message.'
    );
  elsif new.channel = 'note' then
    event_title := 'Note from ' || party_label;
    event_body := coalesce(
      nullif(regexp_replace(coalesce(new.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to open the note.'
    );
  else
    event_title := 'Text message from ' || party_label;
    event_body := coalesce(
      nullif(regexp_replace(coalesce(new.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to read the message.'
    );
  end if;

  perform public.queue_manager_push_event(
    'call_message',
    left(event_title, 160),
    left(event_body, 180),
    exact_href,
    case when is_missed_call then 'missed_call:' else 'call_message:' end || new.id::text,
    case when is_missed_call then 'avantia-missed-call-' else 'avantia-communication-' end || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists aura_communications_manager_push on public.aura_communications;
create trigger aura_communications_manager_push
after insert or update of status on public.aura_communications
for each row execute function public.queue_inbound_communication_push();

revoke all on function public.queue_inbound_communication_push()
  from public, anon, authenticated;

-- Repair already queued/history notifications in place. Read/delivery state is
-- deliberately retained; only copy and the exact destination are corrected.
with communication_alerts as (
  select
    queue.id as queue_id,
    communication.id as communication_id,
    communication.channel,
    communication.status,
    communication.subject,
    communication.body,
    communication.summary,
    communication.transcript,
    private.manager_notification_party_label(
      communication.contact_id,
      communication.counterparty_phone,
      communication.counterparty_email,
      communication.channel
    ) as party_label,
    communication.channel = 'call' and lower(trim(coalesce(communication.status, ''))) in (
      'missed', 'no-answer', 'no_answer', 'not-answered', 'unanswered', 'busy', 'declined'
    ) as is_missed_call
  from public.manager_push_queue as queue
  join public.aura_communications as communication
    on queue.dedupe_key in (
      'call_message:' || communication.id::text,
      'missed_call:' || communication.id::text
    )
  where queue.event_type = 'call_message'
)
update public.manager_push_queue as queue
set
  title = left(case
    when alert.is_missed_call then 'Missed call from ' || alert.party_label
    when alert.channel = 'call' then 'Incoming call from ' || alert.party_label
    when alert.channel = 'email' then 'Email from ' || alert.party_label
    when alert.channel = 'whatsapp' then 'WhatsApp from ' || alert.party_label
    when alert.channel = 'note' then 'Note from ' || alert.party_label
    else 'Text message from ' || alert.party_label
  end, 160),
  body = left(case
    when alert.is_missed_call then coalesce(
      nullif(regexp_replace(coalesce(alert.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(alert.transcript, ''), '\s+', ' ', 'g'), ''),
      'No answer. Tap to review the call and follow up.'
    )
    when alert.channel = 'call' then coalesce(
      nullif(regexp_replace(coalesce(alert.summary, ''), '\s+', ' ', 'g'), ''),
      'Tap to open the call record.'
    )
    when alert.channel = 'email' then coalesce(
      nullif('Subject: ' || trim(coalesce(alert.subject, '')), 'Subject: '),
      nullif(regexp_replace(coalesce(alert.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(alert.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to read the email.'
    )
    when alert.channel = 'note' then coalesce(
      nullif(regexp_replace(coalesce(alert.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(alert.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to open the note.'
    )
    else coalesce(
      nullif(regexp_replace(coalesce(alert.summary, ''), '\s+', ' ', 'g'), ''),
      nullif(regexp_replace(coalesce(alert.body, ''), '\s+', ' ', 'g'), ''),
      'Tap to read the message.'
    )
  end, 180),
  href = '/admin/communications?communication=' || alert.communication_id::text ||
    '&channel=' || case
      when alert.channel in ('call', 'sms', 'whatsapp', 'email') then alert.channel
      else 'all'
    end
from communication_alerts as alert
where queue.id = alert.queue_id;

-- Make every lock-screen notification explain the event without requiring the
-- manager to open Avantia. Identity continues to come from exact internal
-- matches installed by resolve_manager_caller_identity.

create or replace function private.manager_notification_event_copy(
  p_party_label text,
  p_channel text,
  p_status text,
  p_subject text,
  p_body text,
  p_summary text,
  p_transcript text,
  p_media jsonb
)
returns table (event_title text, event_body text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  channel_value text := lower(trim(coalesce(p_channel, '')));
  status_value text := lower(trim(coalesce(p_status, '')));
  party_value text := coalesce(nullif(trim(p_party_label), ''), 'Unknown sender');
  subject_value text := regexp_replace(trim(coalesce(p_subject, '')), '\s+', ' ', 'g');
  preview_value text := regexp_replace(trim(coalesce(
    nullif(p_summary, ''),
    nullif(p_body, ''),
    nullif(p_transcript, '')
  )), '\s+', ' ', 'g');
  attachment_count integer := case
    when jsonb_typeof(coalesce(p_media, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(p_media, '[]'::jsonb))
    else 0
  end;
  attachment_label text := case
    when attachment_count = 1 then '1 attachment'
    when attachment_count > 1 then attachment_count::text || ' attachments'
    else ''
  end;
  is_missed_call boolean := channel_value = 'call' and status_value in (
    'missed', 'no-answer', 'no_answer', 'not-answered', 'unanswered', 'busy', 'declined'
  );
begin
  if is_missed_call then
    event_title := 'Missed call · ' || party_value;
    event_body := concat_ws(' · ', 'What happened: the call was not answered', nullif(preview_value, ''), nullif(attachment_label, ''));
  elsif channel_value = 'call' then
    event_title := 'Incoming call · ' || party_value;
    event_body := concat_ws(' · ', 'What happened: an incoming call was received', nullif(preview_value, ''), nullif(attachment_label, ''));
  elsif channel_value = 'email' then
    event_title := 'Email received · ' || party_value;
    event_body := concat_ws(' · ',
      case when subject_value <> '' then 'Subject: ' || subject_value else 'No subject' end,
      case when preview_value <> '' and preview_value <> subject_value then 'Preview: ' || preview_value else null end,
      nullif(attachment_label, '')
    );
  elsif channel_value = 'whatsapp' then
    event_title := 'WhatsApp received · ' || party_value;
    event_body := concat_ws(' · ',
      case when preview_value <> '' then 'Message: ' || preview_value else 'A WhatsApp photo or file was received' end,
      nullif(attachment_label, '')
    );
  elsif channel_value = 'note' then
    event_title := 'Note added · ' || party_value;
    event_body := concat_ws(' · ',
      case when preview_value <> '' then 'Note: ' || preview_value else 'A new note was added' end,
      nullif(attachment_label, '')
    );
  else
    event_title := 'Text received · ' || party_value;
    event_body := concat_ws(' · ',
      case when preview_value <> '' then 'Message: ' || preview_value else 'A text message was received' end,
      nullif(attachment_label, '')
    );
  end if;
  return next;
end;
$$;

revoke all on function private.manager_notification_event_copy(
  text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;

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
  select copy.event_title, copy.event_body into event_title, event_body
  from private.manager_notification_event_copy(
    party_label,
    new.channel,
    new.status,
    new.subject,
    new.body,
    new.summary,
    new.transcript,
    new.media
  ) as copy;

  exact_href := '/admin/communications?communication=' || new.id::text ||
    '&channel=' || case
      when new.channel in ('call', 'sms', 'whatsapp', 'email') then new.channel
      else 'all'
    end;

  perform public.queue_manager_push_event(
    'call_message',
    left(event_title, 160),
    left(event_body, 240),
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

-- Improve still-visible history alerts without changing their read or delivery
-- state. This also makes the in-app notification center match future pushes.
with communication_alerts as (
  select
    queue.id as queue_id,
    communication.id as communication_id,
    communication.channel,
    communication.status,
    copy.event_title,
    copy.event_body
  from public.manager_push_queue as queue
  join public.aura_communications as communication
    on queue.dedupe_key in (
      'call_message:' || communication.id::text,
      'missed_call:' || communication.id::text
    )
  cross join lateral private.manager_notification_event_copy(
    private.manager_notification_party_label(
      communication.contact_id,
      communication.counterparty_phone,
      communication.counterparty_email,
      communication.channel
    ),
    communication.channel,
    communication.status,
    communication.subject,
    communication.body,
    communication.summary,
    communication.transcript,
    communication.media
  ) as copy
  where queue.event_type = 'call_message'
)
update public.manager_push_queue as queue
set
  title = left(alert.event_title, 160),
  body = left(alert.event_body, 240),
  href = '/admin/communications?communication=' || alert.communication_id::text ||
    '&channel=' || case
      when alert.channel in ('call', 'sms', 'whatsapp', 'email') then alert.channel
      else 'all'
    end
from communication_alerts as alert
where queue.id = alert.queue_id;

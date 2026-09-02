-- Give managers concise, identifiable communication alerts while preserving
-- the exact communication link used by the notification center and web push.

create or replace function private.manager_notification_party_label(
  p_contact_id uuid,
  p_phone text,
  p_email text,
  p_channel text
)
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  contact_name text;
  company_name text;
  phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  name_digits text;
  email_value text := lower(trim(coalesce(p_email, '')));
begin
  if p_contact_id is not null then
    select nullif(trim(contact.full_name), ''), nullif(trim(contact.company), '')
      into contact_name, company_name
    from public.aura_contacts as contact
    where contact.id = p_contact_id;
  end if;

  name_digits := regexp_replace(coalesce(contact_name, ''), '[^0-9]', '', 'g');
  if contact_name is not null
     and not (phone_digits <> '' and name_digits = phone_digits) then
    return left(contact_name, 80);
  end if;
  if company_name is not null then return left(company_name, 80); end if;
  if length(phone_digits) >= 4 then
    return 'Phone ending ' || right(phone_digits, 4);
  end if;
  if position('@' in email_value) > 1 then
    return left(email_value, 1) || '***@' || split_part(email_value, '@', 2);
  end if;
  return case when p_channel = 'call' then 'Unknown caller' else 'Unknown sender' end;
end;
$$;

revoke all on function private.manager_notification_party_label(uuid, text, text, text)
  from public, anon, authenticated;

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
    '&channel=' || coalesce(nullif(new.channel, ''), 'all');

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

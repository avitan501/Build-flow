-- Resolve inbound caller identity from exact normalized internal phone matches.
-- Distinct records sharing a number remain visibly ambiguous; no provider name
-- metadata or fuzzy/last-four matching is trusted.

create or replace function private.manager_notification_normalized_phone(p_value text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  input_value text := trim(coalesce(p_value, ''));
  digits text := regexp_replace(trim(coalesce(p_value, '')), '[^0-9]', '', 'g');
begin
  if input_value = '' then return null; end if;
  if left(input_value, 1) = '+' then
    if left(digits, 5) = '34347' and length(digits) = 13 then digits := substring(digits from 3); end if;
    if length(digits) between 8 and 15 then return '+' || digits; end if;
    return null;
  end if;
  if length(digits) = 10 then return '+1' || digits; end if;
  if length(digits) = 11 and left(digits, 1) = '1' then return '+' || digits; end if;
  return null;
end;
$$;

revoke all on function private.manager_notification_normalized_phone(text)
  from public, anon, authenticated;

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
  target_phone text := private.manager_notification_normalized_phone(p_phone);
  email_value text := lower(trim(coalesce(p_email, '')));
  candidate_count integer := 0;
  candidate_labels text := '';
  direct_contact_label text;
begin
  if target_phone is not null then
    with raw_candidates as (
      select
        'customer:' || profile.id::text as canonical_key,
        1 as priority,
        concat_ws(' · ', nullif(trim(profile.full_name), ''), nullif(trim(profile.company_name), '')) as display_label,
        private.manager_notification_normalized_phone(profile.phone) as normalized_phone
      from public.profiles as profile
      where profile.role = 'client'

      union all

      select
        'lead:' || lead.id::text,
        2,
        concat_ws(' · ', nullif(trim(lead.full_name), ''), nullif(trim(lead.company_name), '')),
        private.manager_notification_normalized_phone(lead.phone)
      from public.manager_outreach_leads as lead

      union all

      select
        case
          when contact.notes ~ '^Avantia link:(customer|lead|supplier):[A-Za-z0-9_-]+$'
            then regexp_replace(contact.notes, '^Avantia link:', '')
          else 'contact:' || contact.id::text
        end,
        4,
        concat_ws(' · ', nullif(trim(contact.full_name), ''), nullif(trim(contact.company), '')),
        private.manager_notification_normalized_phone(contact.normalized_phone)
      from public.aura_contacts as contact

      union all

      select
        'supplier:' || supplier.value->>'id',
        3,
        concat_ws(' · ', nullif(trim(supplier.value->>'contactName'), ''), nullif(trim(supplier.value->>'name'), '')),
        private.manager_notification_normalized_phone(phone.value)
      from public.workflow_manager_settings as settings
      cross join lateral jsonb_array_elements(coalesce(settings.state #> '{qualificationSettings,suppliers}', '[]'::jsonb)) as supplier(value)
      cross join lateral (values (supplier.value->>'phone'), (supplier.value->>'whatsapp')) as phone(value)
      where settings.id = 'singleton' and nullif(trim(phone.value), '') is not null

      union all

      select
        'supplier:' || supplier.value->>'id',
        3,
        concat_ws(' · ', nullif(trim(additional.value->>'name'), ''), nullif(trim(supplier.value->>'name'), '')),
        private.manager_notification_normalized_phone(additional.value->>'phone')
      from public.workflow_manager_settings as settings
      cross join lateral jsonb_array_elements(coalesce(settings.state #> '{qualificationSettings,suppliers}', '[]'::jsonb)) as supplier(value)
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(supplier.value->'additionalContacts') = 'array'
          then supplier.value->'additionalContacts' else '[]'::jsonb end
      ) as additional(value)
      where settings.id = 'singleton'

      union all

      select
        (case when link.entity_type = 'client' then 'customer' else link.entity_type end) || ':' || link.entity_id,
        case link.entity_type when 'client' then 1 when 'lead' then 2 when 'supplier' then 3 else 5 end,
        nullif(trim(link.entity_label), ''),
        private.manager_notification_normalized_phone(communication.counterparty_phone)
      from public.aura_communication_links as link
      join public.aura_communications as communication on communication.id = link.communication_id
      where link.entity_type in ('client', 'lead', 'supplier')
    ), canonical_candidates as (
      select distinct on (candidate.canonical_key)
        candidate.canonical_key,
        candidate.priority,
        candidate.display_label
      from raw_candidates as candidate
      where candidate.normalized_phone = target_phone
        and nullif(trim(candidate.display_label), '') is not null
        and candidate.display_label !~* '^(unknown|phone ending)'
        and private.manager_notification_normalized_phone(candidate.display_label) is distinct from target_phone
      order by candidate.canonical_key, candidate.priority, candidate.display_label
    )
    select count(*)::integer,
      string_agg(display_label, ' / ' order by priority, lower(display_label), canonical_key)
      into candidate_count, candidate_labels
    from canonical_candidates;

    if candidate_count = 1 then return left(candidate_labels, 80); end if;
    if candidate_count > 1 then
      return left(candidate_count::text || ' exact matches: ' || candidate_labels, 80);
    end if;
  end if;

  if p_contact_id is not null then
    select concat_ws(' · ', nullif(trim(contact.full_name), ''), nullif(trim(contact.company), ''))
      into direct_contact_label
    from public.aura_contacts as contact
    where contact.id = p_contact_id;
    if nullif(trim(direct_contact_label), '') is not null
       and direct_contact_label !~* '^(unnamed|unknown|phone ending)'
       and private.manager_notification_normalized_phone(direct_contact_label) is distinct from target_phone then
      return left(direct_contact_label, 80);
    end if;
  end if;

  if target_phone is not null then
    return left(case when p_channel = 'call' then 'Unknown caller · ' else 'Unknown sender · ' end || target_phone, 80);
  end if;
  if position('@' in email_value) > 1 then
    return left(email_value, 1) || '***@' || split_part(email_value, '@', 2);
  end if;
  return case when p_channel = 'call' then 'Unknown caller' else 'Unknown sender' end;
end;
$$;

revoke all on function private.manager_notification_party_label(uuid, text, text, text)
  from public, anon, authenticated;

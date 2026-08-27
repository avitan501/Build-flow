begin;

do $$
declare
  v_intake_id uuid;
  v_result jsonb;
  v_status text;
begin
  insert into public.aura_intakes (
    source,
    external_message_id,
    sender_phone,
    message_type,
    message_text,
    raw_payload,
    proposal,
    status,
    confirmation_code,
    ai_model
  ) values (
    'sms',
    'test:ai-inbox:' || gen_random_uuid()::text,
    '+13475675077',
    'text',
    'add task Call the test supplier tomorrow',
    '{"test":true}'::jsonb,
    '{"recordType":"task","summary":"Call the test supplier tomorrow","contact":null,"lead":null,"tasks":[{"title":"Call the test supplier tomorrow","notes":null,"dueAt":null,"priority":"normal"}],"request":null,"missingInformation":[],"needsFollowUp":false}'::jsonb,
    'pending',
    upper(substr(md5(random()::text), 1, 6)),
    'test'
  ) returning id into v_intake_id;

  select public.confirm_aura_intake(v_intake_id, null) into v_result;
  if coalesce((v_result ->> 'reviewRequired')::boolean, false) is not true then
    raise exception 'SMS intake was not held for owner review';
  end if;

  select status into v_status from public.aura_intakes where id = v_intake_id;
  if v_status <> 'pending' then
    raise exception 'SMS intake status changed before owner approval: %', v_status;
  end if;

  if exists (select 1 from public.aura_tasks where source_intake_id = v_intake_id) then
    raise exception 'A task was created before owner approval';
  end if;

  if not exists (select 1 from public.aura_audit_log where intake_id = v_intake_id and action = 'sms_command_received') then
    raise exception 'SMS receipt was not written to the activity log';
  end if;
end;
$$;

rollback;

select 'AI SMS review gate passed; test transaction rolled back' as result;

begin;
select plan(34);

select has_table('public', 'aura_sms_request_states', 'structured SMS request state table exists');
select has_table('public', 'aura_sms_request_state_slots', 'structured scalar slot history exists');
select has_table('public', 'aura_sms_request_state_items', 'structured material item history exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.aura_sms_request_states'::regclass),
  'request states have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.aura_sms_request_state_slots'::regclass),
  'request state slots have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.aura_sms_request_state_items'::regclass),
  'request state items have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.aura_sms_request_states', 'select,insert,update,delete'),
  'anonymous users have no state-table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.aura_sms_request_state_slots', 'select,insert,update,delete'),
  'anonymous users have no slot-table privileges'
);
select ok(
  not has_table_privilege('anon', 'public.aura_sms_request_state_items', 'select,insert,update,delete'),
  'anonymous users have no item-table privileges'
);

select ok(
  has_table_privilege('authenticated', 'public.aura_sms_request_states', 'select,update')
    and not has_table_privilege('authenticated', 'public.aura_sms_request_states', 'insert,delete'),
  'authenticated managers receive only state select and update grants'
);
select ok(
  has_table_privilege('authenticated', 'public.aura_sms_request_state_slots', 'select,update')
    and not has_table_privilege('authenticated', 'public.aura_sms_request_state_slots', 'insert,delete'),
  'authenticated managers receive only slot select and update grants'
);
select ok(
  has_table_privilege('authenticated', 'public.aura_sms_request_state_items', 'select,update')
    and not has_table_privilege('authenticated', 'public.aura_sms_request_state_items', 'insert,delete'),
  'authenticated managers receive only item select and update grants'
);

select ok(
  has_table_privilege('service_role', 'public.aura_sms_request_states', 'select,insert,update,delete'),
  'service role owns state persistence'
);
select ok(
  has_table_privilege('service_role', 'public.aura_sms_request_state_slots', 'select,insert,update,delete'),
  'service role owns slot persistence'
);
select ok(
  has_table_privilege('service_role', 'public.aura_sms_request_state_items', 'select,insert,update,delete'),
  'service role owns item persistence'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'aura_sms_request_states' and policyname = 'aura_sms_request_states_manager_read'),
  'state manager read policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'aura_sms_request_states' and policyname = 'aura_sms_request_states_manager_update'),
  'state manager update policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'aura_sms_request_state_slots' and policyname = 'aura_sms_request_state_slots_manager_read'),
  'slot manager read policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'aura_sms_request_state_slots' and policyname = 'aura_sms_request_state_slots_manager_update'),
  'slot manager update policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'aura_sms_request_state_items' and policyname = 'aura_sms_request_state_items_manager_read'),
  'item manager read policy exists'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'aura_sms_request_state_items' and policyname = 'aura_sms_request_state_items_manager_update'),
  'item manager update policy exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.aura_sms_request_states'::regclass
      and pg_get_constraintdef(oid) like '%cardinality(last_asked_slots) <= 3%'
  ),
  'a turn can persist no more than three requested slots'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'aura_sms_request_states_one_live_phone_uidx' and indexdef like '%UNIQUE%' and indexdef like '%collecting%' and indexdef like '%awaiting_confirmation%'),
  'one live AI intake per phone is database-enforced'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'aura_sms_request_state_slots_one_current_uidx' and indexdef like '%UNIQUE%'),
  'one current scalar value per slot is database-enforced'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'aura_sms_request_state_items_active_ordinal_uidx' and indexdef like '%UNIQUE%'),
  'one active item per ordinal is database-enforced'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.aura_sms_request_states'::regclass
      and pg_get_constraintdef(oid) like '%state_version > 0%'
  ),
  'state version remains positive for optimistic transition checks'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.aura_sms_request_states'::regclass
      and pg_get_constraintdef(oid) like '%jsonb_typeof(question_attempts)%object%'
  ),
  'question prompt history must remain a JSON object'
);

select lives_ok(
  $$insert into public.aura_sms_request_states (
      id, normalized_phone, last_asked_slots
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '+19999990001',
      array['quantity', 'delivery_address', 'needed_by']
    )$$,
  'a turn may persist three relevant requested slots'
);
select throws_ok(
  $$insert into public.aura_sms_request_states (
      normalized_phone, last_asked_slots
    ) values (
      '+19999990002',
      array['product', 'quantity', 'delivery_address', 'needed_by']
    )$$,
  '23514',
  null,
  'a turn cannot persist four requested slots'
);
select throws_ok(
  $$insert into public.aura_sms_request_states (normalized_phone)
    values ('+19999990001')$$,
  '23505',
  null,
  'a phone cannot have two collecting or awaiting-confirmation states'
);
select lives_ok(
  $$insert into public.aura_sms_request_states (normalized_phone, status)
    values ('+19999990001', 'human_review')$$,
  'historical or human-review state does not block a new live intake'
);
select lives_ok(
  $$insert into public.aura_sms_request_state_slots (
      state_id, slot_key, value_text, confidence
    ) values (
      '10000000-0000-0000-0000-000000000001',
      'delivery_address',
      '123 Test Street, Testville, NY 10001',
      1
    )$$,
  'the first current scalar slot is accepted'
);
select throws_ok(
  $$insert into public.aura_sms_request_state_slots (
      state_id, slot_key, value_text, confidence, status
    ) values (
      '10000000-0000-0000-0000-000000000001',
      'delivery_address',
      '456 Conflicting Street, Testville, NY 10001',
      1,
      'confirmed'
    )$$,
  '23505',
  null,
  'a second current value cannot silently replace scalar evidence'
);
select lives_ok(
  $$insert into public.aura_sms_request_state_items (
      state_id, ordinal, name, quantity, unit, confidence
    ) values (
      '10000000-0000-0000-0000-000000000001',
      1,
      '2x4 lumber',
      12,
      'piece',
      1
    )$$,
  'the first active item ordinal is accepted'
);

select * from finish();
rollback;

begin;
select plan(12);

select has_table('public', 'customer_request_portal_access', 'portal ownership table exists');
select has_table('public', 'aura_sms_request_pending_confirmations', 'pending exact-summary table exists');
select has_table('public', 'customer_request_portal_invite_outbox', 'durable invitation outbox exists');
select has_column('public', 'quote_requests', 'public_number', 'request has a public number');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.customer_request_portal_access'::regclass),
  'portal access has RLS enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.customer_request_portal_access', 'select')
  and not has_table_privilege('authenticated', 'public.customer_request_portal_access', 'insert,update,delete'),
  'customers can read but cannot forge portal access'
);
select ok(
  not has_table_privilege('anon', 'public.customer_request_portal_access', 'select,insert,update,delete'),
  'anonymous users have no portal-table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.aura_sms_request_pending_confirmations', 'select,insert,update,delete'),
  'customers cannot read or alter pending AI summaries'
);
select ok(
  not has_table_privilege('authenticated', 'public.customer_request_portal_invite_outbox', 'select,insert,update,delete'),
  'customers cannot read or alter the SMS outbox'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customer_request_portal_access' and policyname = 'customer_request_portal_access_owner_read'),
  'portal read policy is ownership-scoped'
);
select ok(
  has_function_privilege('authenticated', 'public.claim_customer_request_portal_access()', 'execute')
  and not has_function_privilege('anon', 'public.claim_customer_request_portal_access()', 'execute'),
  'only authenticated users can claim access with their verified JWT phone'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'quote_requests' and indexname = 'quote_requests_public_number_uidx'),
  'public request numbers are database-unique'
);

select * from finish();
rollback;

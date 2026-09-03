begin;
select plan(8);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.request_client_document_acceptances'::regclass),
  'acceptance receipts have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.request_client_document_acceptances', 'select,insert,update,delete'),
  'anonymous visitors cannot access receipt rows directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.request_client_document_acceptances', 'select,insert,update,delete'),
  'authenticated users cannot access receipt rows directly'
);

select ok(
  has_table_privilege('service_role', 'public.request_client_document_acceptances', 'select,insert'),
  'the server role can read and create receipt rows'
);

select ok(
  not has_table_privilege('service_role', 'public.request_client_document_acceptances', 'update,delete'),
  'the server role has no direct update or delete grant'
);

select ok(
  not has_function_privilege('anon', 'public.accept_request_client_document(uuid,integer,text,text,text,text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.accept_request_client_document(uuid,integer,text,text,text,text,text)', 'execute'),
  'only the server can invoke the acceptance mutation'
);

select ok(
  has_function_privilege('service_role', 'public.accept_request_client_document(uuid,integer,text,text,text,text,text)', 'execute'),
  'the server role can invoke the acceptance mutation'
);

select ok(
  has_function_privilege('anon', 'public.get_request_client_document(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.get_request_client_document(uuid)', 'execute'),
  'the opaque public lookup remains available'
);

select * from finish();
rollback;

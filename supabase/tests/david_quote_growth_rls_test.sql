begin;
select plan(8);

select has_table(
  'public',
  'david_quote_growth_metrics',
  'quote growth tracker table exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.david_quote_growth_metrics'::regclass),
  'row level security is enabled'
);

select ok(
  not has_table_privilege('anon', 'public.david_quote_growth_metrics', 'select'),
  'anonymous visitors cannot read owner progress'
);

select ok(
  not has_table_privilege('anon', 'public.david_quote_growth_metrics', 'insert,update,delete'),
  'anonymous visitors cannot change owner progress'
);

select ok(
  has_table_privilege('authenticated', 'public.david_quote_growth_metrics', 'select,insert,update'),
  'authenticated role has only the operations guarded by owner policies'
);

select ok(
  not has_table_privilege('authenticated', 'public.david_quote_growth_metrics', 'delete'),
  'tracker rows cannot be deleted through the client API'
);

select results_eq(
  $$
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'david_quote_growth_metrics'
    order by policyname
  $$,
  $$values
    ('david_quote_growth_owner_insert'::name),
    ('david_quote_growth_owner_read'::name),
    ('david_quote_growth_owner_update'::name)
  $$,
  'the tracker exposes only explicit owner policies'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.david_quote_growth_metrics
    where period_kind = 'campaign'
  $$,
  array[7::bigint],
  'all seven 30-day goals are seeded'
);

select * from finish();
rollback;

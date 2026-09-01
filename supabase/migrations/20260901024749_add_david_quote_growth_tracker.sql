create table if not exists public.david_quote_growth_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  period_kind text not null check (period_kind in ('daily', 'campaign')),
  period_start date not null,
  label text not null,
  target_count integer not null check (target_count > 0 and target_count <= 100000),
  actual_count integer not null default 0 check (actual_count >= 0 and actual_count <= 100000),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (metric_key, period_kind, period_start)
);

alter table public.david_quote_growth_metrics enable row level security;

revoke all on table public.david_quote_growth_metrics from anon, authenticated;
grant select, insert, update on table public.david_quote_growth_metrics to authenticated;

create policy "david_quote_growth_owner_read"
on public.david_quote_growth_metrics
for select
to authenticated
using ((select private.is_admin()));

create policy "david_quote_growth_owner_insert"
on public.david_quote_growth_metrics
for insert
to authenticated
with check (
  (select private.is_admin())
  and updated_by = (select auth.uid())
);

create policy "david_quote_growth_owner_update"
on public.david_quote_growth_metrics
for update
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and updated_by = (select auth.uid())
);

create index if not exists david_quote_growth_metrics_period_idx
  on public.david_quote_growth_metrics (period_kind, period_start desc, sort_order);

insert into public.david_quote_growth_metrics
  (metric_key, period_kind, period_start, label, target_count, sort_order)
values
  ('prospects', 'campaign', current_date, 'Prospects', 100, 10),
  ('real_calls', 'campaign', current_date, 'Real conversations', 40, 20),
  ('quotes_received', 'campaign', current_date, 'Quotes received', 20, 30),
  ('comparisons_returned', 'campaign', current_date, 'Comparisons returned', 10, 40),
  ('purchases', 'campaign', current_date, 'Purchases', 5, 50),
  ('repeat_customers', 'campaign', current_date, 'Repeat customers', 2, 60),
  ('referrals', 'campaign', current_date, 'Referrals', 1, 70)
on conflict (metric_key, period_kind, period_start) do nothing;

comment on table public.david_quote_growth_metrics is
  'Private owner-only progress for Avantia Build quote comparison customer acquisition.';

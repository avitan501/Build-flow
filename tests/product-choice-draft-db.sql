-- Run only in an empty isolated PostgreSQL test database, never production.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create table public.quote_comparisons (
  id uuid primary key, title text default '', department text default '', job_address text default '', project_id uuid,
  client_delivery_charge numeric default 0, client_tax_percent numeric default 0, status text default 'review', awarded_bid_id uuid
);
create table public.quote_comparison_items (id uuid primary key, comparison_id uuid references public.quote_comparisons on delete cascade);
create table public.quote_comparison_bids (id uuid primary key, comparison_id uuid references public.quote_comparisons on delete cascade);
create table public.quote_comparison_prices (bid_id uuid references public.quote_comparison_bids on delete cascade, item_id uuid references public.quote_comparison_items on delete cascade, unit_price numeric, primary key(bid_id,item_id));
alter table public.quote_comparisons enable row level security;
alter table public.quote_comparison_items enable row level security;
alter table public.quote_comparison_bids enable row level security;
alter table public.quote_comparison_prices enable row level security;
create policy staff_parent on public.quote_comparisons for all to authenticated using (current_setting('test.is_staff', true) = 'true') with check (current_setting('test.is_staff', true) = 'true');
create policy staff_items on public.quote_comparison_items for all to authenticated using (current_setting('test.is_staff', true) = 'true') with check (current_setting('test.is_staff', true) = 'true');
create policy staff_bids on public.quote_comparison_bids for all to authenticated using (current_setting('test.is_staff', true) = 'true') with check (current_setting('test.is_staff', true) = 'true');
create policy staff_prices on public.quote_comparison_prices for all to authenticated using (current_setting('test.is_staff', true) = 'true') with check (current_setting('test.is_staff', true) = 'true');
grant select,insert,update,delete on all tables in schema public to authenticated;
\i /migration.sql
set role authenticated;
set test.is_staff = 'true';
insert into public.quote_comparisons(id) values ('00000000-0000-4000-8000-000000000001');
do $$ begin
  begin
    update public.quote_comparisons set product_choice_draft='{}';
    raise exception 'missing schema version unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;
insert into public.quote_comparison_items values ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
insert into public.quote_comparison_bids values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001');
insert into public.quote_comparison_prices values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',3);
do $$ begin
  assert (select product_choice_draft_revision = 3 from public.quote_comparisons), 'child inserts must invalidate revision';
end $$;
update public.quote_comparisons set product_choice_draft = '{"version":1,"selections":{}}', product_choice_draft_revision=4, product_choice_draft_source_fingerprint=repeat('a',64) where product_choice_draft_revision=3 and status in ('draft','review');
do $$ declare affected integer; begin
  update public.quote_comparisons set product_choice_draft='{"version":1,"selections":{},"stale":true}',product_choice_draft_revision=4 where product_choice_draft_revision=3 and status in ('draft','review');
  get diagnostics affected = row_count;
  assert affected = 0, 'stale writer must not overwrite';
  assert (select product_choice_draft_revision=4 and product_choice_draft='{"version":1,"selections":{}}' from public.quote_comparisons), 'draft update increments exactly once';
end $$;
update public.quote_comparison_prices set unit_price=4;
update public.quote_comparisons set client_tax_percent=8;
do $$ begin assert (select product_choice_draft_revision=6 from public.quote_comparisons), 'business edits invalidate draft revision'; end $$;
update public.quote_comparisons set product_choice_draft_revision=7 where product_choice_draft_revision=6;
update public.quote_comparisons set status='awarded';
do $$ declare affected integer; begin
  update public.quote_comparisons set product_choice_draft_revision=9 where product_choice_draft_revision=8 and status in ('draft','review');
  get diagnostics affected = row_count;
  assert affected=0, 'locked status blocks draft CAS';
  assert (select product_choice_draft_revision=8 from public.quote_comparisons), 'status edit increments revision';
end $$;
set test.is_staff = 'false';
do $$ declare affected integer; begin
  update public.quote_comparisons set product_choice_draft_revision=99;
  get diagnostics affected = row_count;
  assert affected=0, 'nonstaff RLS cannot update draft';
end $$;
reset role;
create function public.test_supplier_submit() returns void language sql security definer set search_path='' as $$
  update public.quote_comparison_prices set unit_price=5 where bid_id='00000000-0000-4000-8000-000000000003' and item_id='00000000-0000-4000-8000-000000000002';
$$;
revoke all on function public.test_supplier_submit() from public;
grant execute on function public.test_supplier_submit() to anon;
set role anon;
select public.test_supplier_submit();
do $$ begin
  begin
    update public.quote_comparisons set product_choice_draft_revision=99;
    raise exception 'anon unexpectedly acquired direct draft write';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin assert (select product_choice_draft_revision=9 from public.quote_comparisons), 'authorized definer supplier flow still invalidates draft'; end $$;
update public.quote_comparisons set status='review';
select 'draft migration/RLS/trigger checks passed' as result;

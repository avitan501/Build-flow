alter table public.supplier_quotes
  add column if not exists lead_time_days integer
    check (lead_time_days is null or (lead_time_days >= 0 and lead_time_days <= 3650));

comment on column public.supplier_quotes.lead_time_days is
  'Supplier lead time explicitly stated in the reviewed source quote.';

alter table public.website_work_items
  add column if not exists resolution_cost numeric(12, 2)
  check (resolution_cost is null or resolution_cost >= 0);

update public.website_work_items
set summary = ''
where item_kind = 'pain'
  and summary = 'Pain David is resolving.';

comment on column public.website_work_items.resolution_cost is
  'Owner-entered estimated dollar cost to resolve a private pain item.';

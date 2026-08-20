create table if not exists public.supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  supplier_id text,
  supplier_name text not null check (char_length(trim(supplier_name)) between 1 and 200),
  quote_number text not null default '' check (char_length(quote_number) <= 100),
  department text not null default 'Others' check (char_length(trim(department)) between 1 and 120),
  quote_date date,
  expires_on date,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'ready', 'cataloged', 'comparison', 'client_quote', 'archived')),
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  file_path text not null unique check (char_length(trim(file_path)) between 1 and 1000),
  mime_type text not null default 'application/octet-stream' check (char_length(mime_type) <= 160),
  file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  raw_text text not null default '',
  extraction_note text not null default '' check (char_length(extraction_note) <= 2000),
  notes text not null default '' check (char_length(notes) <= 4000),
  delivery_charge numeric(14, 2) not null default 0 check (delivery_charge >= 0),
  tax_percent numeric(7, 4) not null default 0 check (tax_percent >= 0 and tax_percent <= 100),
  comparison_id uuid references public.quote_comparisons(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.supplier_quotes(id) on delete cascade,
  line_number integer not null default 0 check (line_number >= 0),
  item_code text not null default '' check (char_length(item_code) <= 120),
  description text not null check (char_length(trim(description)) between 1 and 500),
  specification text not null default '' check (char_length(specification) <= 1000),
  quantity numeric(14, 3) not null default 1 check (quantity > 0 and quantity <= 100000000),
  unit text not null default 'each' check (char_length(trim(unit)) between 1 and 40),
  unit_price numeric(14, 4) check (unit_price is null or (unit_price >= 0 and unit_price <= 100000000)),
  line_total numeric(14, 2) check (line_total is null or (line_total >= 0 and line_total <= 100000000)),
  selected boolean not null default true,
  review_status text not null default 'needs_review' check (review_status in ('needs_review', 'ready', 'ignored')),
  catalog_item_id uuid references public.material_catalog_items(id) on delete set null,
  comparison_item_id uuid references public.quote_comparison_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, line_number)
);

create index if not exists supplier_quotes_updated_idx on public.supplier_quotes(updated_at desc);
create index if not exists supplier_quotes_supplier_idx on public.supplier_quotes(supplier_id, updated_at desc);
create index if not exists supplier_quotes_status_idx on public.supplier_quotes(status, updated_at desc);
create index if not exists supplier_quote_items_quote_idx on public.supplier_quote_items(quote_id, line_number);

drop trigger if exists set_supplier_quotes_updated_at on public.supplier_quotes;
create trigger set_supplier_quotes_updated_at
before update on public.supplier_quotes
for each row execute function public.set_projects_updated_at();

drop trigger if exists set_supplier_quote_items_updated_at on public.supplier_quote_items;
create trigger set_supplier_quote_items_updated_at
before update on public.supplier_quote_items
for each row execute function public.set_projects_updated_at();

alter table public.supplier_quotes enable row level security;
alter table public.supplier_quote_items enable row level security;

revoke all on public.supplier_quotes from anon;
revoke all on public.supplier_quote_items from anon;
grant select, insert, update, delete on public.supplier_quotes to authenticated;
grant select, insert, update, delete on public.supplier_quote_items to authenticated;

create policy supplier_quotes_supplier_staff_read
on public.supplier_quotes for select to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy supplier_quotes_supplier_staff_insert
on public.supplier_quotes for insert to authenticated
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and created_by = (select auth.uid())
);

create policy supplier_quotes_supplier_staff_update
on public.supplier_quotes for update to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
with check ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy supplier_quotes_supplier_staff_delete
on public.supplier_quotes for delete to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy supplier_quote_items_supplier_staff_all
on public.supplier_quote_items for all to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (select 1 from public.supplier_quotes quote where quote.id = quote_id)
)
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
  and exists (select 1 from public.supplier_quotes quote where quote.id = quote_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-quotes',
  'supplier-quotes',
  false,
  26214400,
  array['application/pdf', 'text/csv', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy supplier_quote_files_staff_read
on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

create policy supplier_quote_files_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'supplier-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

create policy supplier_quote_files_staff_update
on storage.objects for update to authenticated
using (
  bucket_id = 'supplier-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
)
with check (
  bucket_id = 'supplier-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

create policy supplier_quote_files_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'supplier-quotes'
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

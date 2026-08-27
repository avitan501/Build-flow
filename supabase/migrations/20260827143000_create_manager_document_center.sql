create table if not exists public.manager_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null default 'unknown'
    check (document_type in ('supplier_quote', 'supplier_invoice', 'receipt', 'catalog_price_list', 'client_estimate', 'material_list', 'purchase_order', 'project_document', 'unknown')),
  status text not null default 'needs_review'
    check (status in ('processing', 'needs_review', 'ready', 'routed', 'archived', 'error')),
  title text not null default '' check (char_length(title) <= 240),
  party_name text not null default '' check (char_length(party_name) <= 200),
  document_number text not null default '' check (char_length(document_number) <= 100),
  document_date date,
  due_date date,
  expires_on date,
  department text not null default 'Others' check (char_length(department) <= 120),
  currency text not null default 'USD' check (char_length(currency) between 3 and 8),
  subtotal numeric(14, 2) check (subtotal is null or subtotal >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  delivery_charge numeric(14, 2) not null default 0 check (delivery_charge >= 0),
  tax_amount numeric(14, 2) check (tax_amount is null or tax_amount >= 0),
  tax_percent numeric(7, 4) check (tax_percent is null or (tax_percent >= 0 and tax_percent <= 100)),
  total numeric(14, 2) check (total is null or total >= 0),
  storage_bucket text not null check (char_length(trim(storage_bucket)) between 1 and 100),
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  file_path text not null check (char_length(trim(file_path)) between 1 and 1000),
  mime_type text not null default 'application/octet-stream' check (char_length(mime_type) <= 160),
  file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  source_sha256 text check (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$'),
  raw_text text not null default '',
  classification_confidence numeric(5, 4) check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1)),
  extraction_note text not null default '' check (char_length(extraction_note) <= 2000),
  evidence jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  suggested_actions jsonb not null default '[]'::jsonb,
  client_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  request_id uuid references public.quote_requests(id) on delete set null,
  supplier_id text,
  legacy_supplier_quote_id uuid unique references public.supplier_quotes(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, file_path)
);

create table if not exists public.manager_document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.manager_documents(id) on delete cascade,
  line_number integer not null default 0 check (line_number >= 0),
  item_code text not null default '' check (char_length(item_code) <= 120),
  description text not null check (char_length(trim(description)) between 1 and 500),
  specification text not null default '' check (char_length(specification) <= 1000),
  quantity numeric(14, 3) check (quantity is null or (quantity > 0 and quantity <= 100000000)),
  unit text not null default '' check (char_length(unit) <= 40),
  unit_price numeric(14, 4) check (unit_price is null or (unit_price >= 0 and unit_price <= 100000000)),
  line_total numeric(14, 2) check (line_total is null or (line_total >= 0 and line_total <= 100000000)),
  source_page integer check (source_page is null or source_page > 0),
  source_text text not null default '' check (char_length(source_text) <= 1000),
  confidence numeric(5, 4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  validation_status text not null default 'needs_review'
    check (validation_status in ('valid', 'needs_review', 'mismatch')),
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, line_number)
);

create table if not exists public.manager_document_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.manager_documents(id) on delete cascade,
  event_type text not null check (event_type in ('uploaded', 'classified', 'extracted', 'reviewed', 'routed', 'archived', 'error')),
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists manager_documents_status_updated_idx on public.manager_documents(status, updated_at desc);
create index if not exists manager_documents_type_updated_idx on public.manager_documents(document_type, updated_at desc);
create index if not exists manager_documents_party_updated_idx on public.manager_documents(party_name, updated_at desc);
create index if not exists manager_documents_source_sha_idx on public.manager_documents(source_sha256) where source_sha256 is not null;
create index if not exists manager_documents_links_idx on public.manager_documents(client_id, project_id, request_id);
create index if not exists manager_document_items_document_idx on public.manager_document_items(document_id, line_number);
create index if not exists manager_document_events_document_idx on public.manager_document_events(document_id, created_at desc);

drop trigger if exists set_manager_documents_updated_at on public.manager_documents;
create trigger set_manager_documents_updated_at before update on public.manager_documents
for each row execute function public.set_projects_updated_at();
drop trigger if exists set_manager_document_items_updated_at on public.manager_document_items;
create trigger set_manager_document_items_updated_at before update on public.manager_document_items
for each row execute function public.set_projects_updated_at();

alter table public.manager_documents enable row level security;
alter table public.manager_document_items enable row level security;
alter table public.manager_document_events enable row level security;

revoke all on public.manager_documents from anon;
revoke all on public.manager_document_items from anon;
revoke all on public.manager_document_events from anon;
grant select, insert, update, delete on public.manager_documents to authenticated;
grant select, insert, update, delete on public.manager_document_items to authenticated;
grant select, insert, update, delete on public.manager_document_events to authenticated;

create policy manager_documents_staff_all on public.manager_documents for all to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
with check (((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) and created_by is not null);

create policy manager_document_items_staff_all on public.manager_document_items for all to authenticated
using (((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) and exists (select 1 from public.manager_documents document where document.id = document_id))
with check (((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) and exists (select 1 from public.manager_documents document where document.id = document_id));

create policy manager_document_events_staff_all on public.manager_document_events for all to authenticated
using (((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) and exists (select 1 from public.manager_documents document where document.id = document_id))
with check (((select private.is_admin()) or (select private.has_staff_capability('suppliers'))) and exists (select 1 from public.manager_documents document where document.id = document_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manager-documents', 'manager-documents', false, 26214400, array['application/pdf', 'text/csv', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy manager_document_files_staff_read on storage.objects for select to authenticated
using (bucket_id = 'manager-documents' and ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))));
create policy manager_document_files_staff_insert on storage.objects for insert to authenticated
with check (bucket_id = 'manager-documents' and ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))));
create policy manager_document_files_staff_update on storage.objects for update to authenticated
using (bucket_id = 'manager-documents' and ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))))
with check (bucket_id = 'manager-documents' and ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))));
create policy manager_document_files_staff_delete on storage.objects for delete to authenticated
using (bucket_id = 'manager-documents' and ((select private.is_admin()) or (select private.has_staff_capability('suppliers'))));

insert into public.manager_documents (
  document_type, status, title, party_name, document_number, document_date, expires_on, department,
  delivery_charge, tax_percent, storage_bucket, file_name, file_path, mime_type, file_size, raw_text,
  extraction_note, client_id, request_id, supplier_id, legacy_supplier_quote_id, approved_by, approved_at,
  created_by, updated_by, created_at, updated_at
)
select
  'supplier_quote',
  case when quote.status = 'archived' then 'archived' when quote.status = 'needs_review' then 'needs_review' else 'routed' end,
  trim(concat_ws(' ', quote.supplier_name, nullif(quote.quote_number, ''))),
  quote.supplier_name, quote.quote_number, quote.quote_date, quote.expires_on, quote.department,
  quote.delivery_charge, quote.tax_percent, 'supplier-quotes', quote.file_name, quote.file_path, quote.mime_type,
  quote.file_size, quote.raw_text, quote.extraction_note, quote.client_id, comparison.request_id, quote.supplier_id,
  quote.id, case when quote.status <> 'needs_review' then quote.updated_by end,
  case when quote.status <> 'needs_review' then quote.updated_at end,
  quote.created_by, quote.updated_by, quote.created_at, quote.updated_at
from public.supplier_quotes quote
left join public.quote_comparisons comparison on comparison.id = quote.comparison_id
on conflict (legacy_supplier_quote_id) do nothing;

insert into public.manager_document_items (
  document_id, line_number, item_code, description, specification, quantity, unit, unit_price,
  line_total, confidence, validation_status, selected, created_at, updated_at
)
select document.id, item.line_number, item.item_code, item.description, item.specification, item.quantity,
  item.unit, item.unit_price, item.line_total, null,
  case when item.review_status = 'ready' then 'valid' else 'needs_review' end,
  item.selected, item.created_at, item.updated_at
from public.supplier_quote_items item
join public.manager_documents document on document.legacy_supplier_quote_id = item.quote_id
on conflict (document_id, line_number) do nothing;

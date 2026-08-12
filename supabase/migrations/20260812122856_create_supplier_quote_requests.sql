create table if not exists public.supplier_quote_requests (
  id uuid primary key default gen_random_uuid(),
  supplier_id text not null,
  supplier_name text not null,
  supplier_email text not null,
  job_address text not null,
  subject text not null,
  material_list text not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_by uuid not null references public.profiles(id) on delete restrict,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_quote_requests_created_idx
on public.supplier_quote_requests(created_at desc);

create index if not exists supplier_quote_requests_supplier_idx
on public.supplier_quote_requests(supplier_id, created_at desc);

alter table public.supplier_quote_requests enable row level security;

create policy "supplier_quote_requests_staff_read"
on public.supplier_quote_requests
for select
to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')));

create policy "supplier_quote_requests_staff_insert"
on public.supplier_quote_requests
for insert
to authenticated
with check (
  sent_by = (select auth.uid())
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

create policy "supplier_quote_requests_staff_update"
on public.supplier_quote_requests
for update
to authenticated
using ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
with check (
  sent_by = (select auth.uid())
  and ((select private.is_admin()) or (select private.has_staff_capability('suppliers')))
);

revoke all on public.supplier_quote_requests from anon, authenticated;
grant select, insert, update on public.supplier_quote_requests to authenticated;

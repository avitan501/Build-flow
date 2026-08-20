alter table public.supplier_quotes
  add column if not exists client_id uuid references public.profiles(id) on delete set null,
  add column if not exists client_name_snapshot text not null default ''
    check (char_length(client_name_snapshot) <= 200);

create index if not exists supplier_quotes_client_updated_idx
  on public.supplier_quotes(client_id, updated_at desc)
  where client_id is not null;

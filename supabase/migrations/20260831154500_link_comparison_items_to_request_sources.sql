alter table public.quote_comparison_items
  add column if not exists source_request_item_id uuid
  references public.quote_request_items(id) on delete set null;

create unique index if not exists quote_comparison_items_source_request_uidx
  on public.quote_comparison_items (comparison_id, source_request_item_id)
  where source_request_item_id is not null;

create index if not exists quote_comparison_items_source_request_idx
  on public.quote_comparison_items (source_request_item_id)
  where source_request_item_id is not null;

comment on column public.quote_comparison_items.source_request_item_id is
  'Exact request row used to create this comparison item. Null means unmapped; the request worktable must not guess.';

create or replace function public.enforce_quote_comparison_item_source_request()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  comparison_request_id uuid;
  source_request_id uuid;
begin
  if tg_op = 'UPDATE'
    and old.source_request_item_id is not null
    and new.source_request_item_id is distinct from old.source_request_item_id
  then
    -- PostgreSQL implements ON DELETE SET NULL as a nested UPDATE on this
    -- table. Preserve that FK cleanup, but reject direct staff/API rewrites.
    if not (
      new.source_request_item_id is null
      and pg_trigger_depth() > 1
    ) then
      raise exception 'source_request_item_id cannot be changed once linked';
    end if;
  end if;

  if new.source_request_item_id is null then
    return new;
  end if;

  select request_id
  into comparison_request_id
  from public.quote_comparisons
  where id = new.comparison_id;

  select request_id
  into source_request_id
  from public.quote_request_items
  where id = new.source_request_item_id;

  if comparison_request_id is null
    or source_request_id is null
    or comparison_request_id is distinct from source_request_id
  then
    raise exception 'comparison item source must belong to the same request';
  end if;

  return new;
end;
$$;

drop trigger if exists quote_comparison_items_source_request_guard
  on public.quote_comparison_items;

create trigger quote_comparison_items_source_request_guard
before insert or update of comparison_id, source_request_item_id
on public.quote_comparison_items
for each row
execute function public.enforce_quote_comparison_item_source_request();

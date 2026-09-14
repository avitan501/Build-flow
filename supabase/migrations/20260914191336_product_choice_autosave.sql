-- Draft-only persistence. Existing supplier-staff SELECT/UPDATE RLS remains in force.
alter table public.quote_comparisons
  add column product_choice_draft jsonb,
  add column product_choice_draft_revision integer not null default 0,
  add column product_choice_draft_source_fingerprint text,
  add constraint quote_product_choice_draft_revision_valid check (product_choice_draft_revision >= 0),
  add constraint quote_product_choice_draft_valid check (
    product_choice_draft is null or (
      jsonb_typeof(product_choice_draft) = 'object'
      and product_choice_draft @> '{"version":1}'::jsonb
      and coalesce(jsonb_typeof(product_choice_draft->'selections'), '') = 'object'
      and octet_length(product_choice_draft::text) <= 250000
    )
  ),
  add constraint quote_product_choice_draft_fingerprint_valid check (
    product_choice_draft_source_fingerprint is null or product_choice_draft_source_fingerprint ~ '^[a-f0-9]{64}$'
  );

-- Ordinary business edits invalidate an in-flight snapshot CAS. No privileges
-- are elevated and no order, message, award, or price is written by this trigger.
create function public.invalidate_quote_product_choice_draft_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  old_data jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_data jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  target_ids uuid[];
begin
  if tg_table_name = 'quote_comparison_prices' then
    select array_agg(distinct comparison_id) into target_ids
    from public.quote_comparison_bids
    where id in (nullif(old_data->>'bid_id', '')::uuid, nullif(new_data->>'bid_id', '')::uuid);
  else
    target_ids := array[nullif(old_data->>'comparison_id', '')::uuid, nullif(new_data->>'comparison_id', '')::uuid];
  end if;
  update public.quote_comparisons
  set product_choice_draft_revision = product_choice_draft_revision + 1
  where id = any(target_ids);
  return null;
end;
$$;
revoke all on function public.invalidate_quote_product_choice_draft_revision() from public, anon, authenticated;

create trigger quote_product_choice_items_changed after insert or update or delete on public.quote_comparison_items
for each row execute function public.invalidate_quote_product_choice_draft_revision();
create trigger quote_product_choice_bids_changed after insert or update or delete on public.quote_comparison_bids
for each row execute function public.invalidate_quote_product_choice_draft_revision();
create trigger quote_product_choice_prices_changed after insert or update or delete on public.quote_comparison_prices
for each row execute function public.invalidate_quote_product_choice_draft_revision();

-- Parent business details also affect the source snapshot. Autosave-only writes
-- are excluded, so saving a draft increases the revision exactly once.
create function public.invalidate_quote_product_choice_parent_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.title,new.department,new.job_address,new.project_id,new.client_delivery_charge,new.client_tax_percent,new.status,new.awarded_bid_id)
     is distinct from row(old.title,old.department,old.job_address,old.project_id,old.client_delivery_charge,old.client_tax_percent,old.status,old.awarded_bid_id) then
    new.product_choice_draft_revision := greatest(new.product_choice_draft_revision, old.product_choice_draft_revision + 1);
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_quote_product_choice_parent_revision() from public, anon, authenticated;
create trigger quote_product_choice_parent_changed before update on public.quote_comparisons
for each row execute function public.invalidate_quote_product_choice_parent_revision();

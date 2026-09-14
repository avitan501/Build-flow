-- Private staff review evidence, never a mutation of the supplier's wording.
create table public.quote_product_match_confirmations (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null,
  item_id uuid not null,
  actor_id uuid not null references auth.users(id),
  actor_label text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot)='object'),
  selling_unit text not null check (length(btrim(selling_unit)) between 1 and 60),
  foreign key (bid_id,item_id) references public.quote_comparison_prices(bid_id,item_id) on delete cascade
);
alter table public.quote_product_match_confirmations enable row level security;
revoke all on public.quote_product_match_confirmations from public,anon,authenticated;
grant select on public.quote_product_match_confirmations to authenticated;
grant all on public.quote_product_match_confirmations to service_role;

create function public.can_review_product_match() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com')
 or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com'))))
$$;
revoke all on function public.can_review_product_match() from public,anon;
grant execute on function public.can_review_product_match() to authenticated,service_role;
create policy product_match_staff_read on public.quote_product_match_confirmations for select to authenticated using (public.can_review_product_match());
create unique index product_match_one_current_source on public.quote_product_match_confirmations(bid_id,item_id,source_fingerprint) where revoked_at is null;
create function public.invalidate_product_match_choice_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.quote_comparisons set product_choice_draft_revision=product_choice_draft_revision+1
 where id in (select comparison_id from public.quote_comparison_bids where id=case when tg_op='DELETE' then old.bid_id else new.bid_id end);
 return null;
end$$;
revoke all on function public.invalidate_product_match_choice_revision() from public,anon,authenticated;
create trigger product_match_choice_changed after insert or update or delete on public.quote_product_match_confirmations for each row execute function public.invalidate_product_match_choice_revision();

-- Meaningful source edits revoke, even if someone later restores the old values.
create function public.revoke_changed_product_matches() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='quote_comparison_prices' then
  if row(old.unit_price,old.is_available,old.notes) is distinct from row(new.unit_price,new.is_available,new.notes) then
   update public.quote_product_match_confirmations set revoked_at=now() where bid_id=old.bid_id and item_id=old.item_id and revoked_at is null;
  end if;
 elsif tg_table_name='quote_comparison_items' then
  if row(old.description,old.specification,old.quantity,old.unit) is distinct from row(new.description,new.specification,new.quantity,new.unit) then
   update public.quote_product_match_confirmations set revoked_at=now() where item_id=old.id and revoked_at is null;
  end if;
 elsif tg_table_name='quote_comparison_bids' then
  if row(old.supplier_id,old.trust_level_snapshot) is distinct from row(new.supplier_id,new.trust_level_snapshot) or (new.status='declined' and old.status is distinct from new.status) then
   update public.quote_product_match_confirmations set revoked_at=now() where bid_id=old.id and revoked_at is null;
  end if;
 end if;
 return new;
end$$;
revoke all on function public.revoke_changed_product_matches() from public,anon,authenticated;
create trigger product_match_price_changed after update on public.quote_comparison_prices for each row execute function public.revoke_changed_product_matches();
create trigger product_match_item_changed after update on public.quote_comparison_items for each row execute function public.revoke_changed_product_matches();
create trigger product_match_supplier_changed after update on public.quote_comparison_bids for each row execute function public.revoke_changed_product_matches();

create function public.staff_confirm_product_match(p_comparison_id uuid,p_item_id uuid,p_bid_id uuid,p_actor_id uuid,p_expected jsonb,p_source_fingerprint text,p_selling_unit text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_item public.quote_comparison_items%rowtype; v_bid public.quote_comparison_bids%rowtype; v_price public.quote_comparison_prices%rowtype; v_snapshot jsonb; v_label text; v_status text; v_basis text[];
begin
 select case when lower(btrim(u.email))='avitanneto@gmail.com' then 'David' when lower(btrim(u.email))='buildavantiap@gmail.com' then 'Carlos' else 'Staff' end into v_label
 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')));
 if v_label is null then raise exception 'Not authorized'; end if;
 select status into v_status from public.quote_comparisons where id=p_comparison_id for update;
 if v_status is null or v_status not in ('draft','review') then return jsonb_build_object('ok',false); end if;
 -- Child edits can already hold their tuple while their AFTER trigger waits
 -- for this parent. Never wait back on that child: abort safely for retry.
 select * into v_item from public.quote_comparison_items where id=p_item_id and comparison_id=p_comparison_id for update nowait;
 select * into v_bid from public.quote_comparison_bids where id=p_bid_id and comparison_id=p_comparison_id for update nowait;
 select * into v_price from public.quote_comparison_prices where bid_id=p_bid_id and item_id=p_item_id for update nowait;
 if v_item.id is null or v_bid.id is null or v_price.item_id is null then return jsonb_build_object('ok',false); end if;
 v_snapshot:=jsonb_build_object('item',jsonb_build_object('id',v_item.id,'description',v_item.description,'specification',v_item.specification,'quantity',v_item.quantity,'unit',v_item.unit),
 'bid',jsonb_build_object('id',v_bid.id,'supplier_id',v_bid.supplier_id,'trust_level_snapshot',v_bid.trust_level_snapshot),
 'price',jsonb_build_object('unit_price',v_price.unit_price,'is_available',v_price.is_available,'notes',v_price.notes));
 if v_snapshot is distinct from p_expected or p_source_fingerprint !~ '^[a-f0-9]{64}$' or p_source_fingerprint is null
 or v_price.is_available is distinct from true or v_price.unit_price is null or v_price.unit_price::text in ('NaN','Infinity','-Infinity') or v_price.unit_price<0
 or v_item.quantity is null or v_item.quantity::text in ('NaN','Infinity','-Infinity') or v_item.quantity<=0
 or length(btrim(coalesce(v_price.notes,'')))=0 or length(btrim(coalesce(v_item.unit,'')))=0 or lower(btrim(p_selling_unit)) is distinct from lower(btrim(v_item.unit))
 or v_bid.trust_level_snapshot='do-not-use' or v_bid.status='declined'
 or v_price.notes ~* '\m(not available|unavailable|out of stock|not included|excluded)\M'
 then return jsonb_build_object('ok',false); end if;
 v_basis:=regexp_match(lower(v_price.notes),'\mper\s+(box|pack|bundle|case|pallet|roll|sheet|piece|each|foot|feet|sq\.?\s*ft)\M|/\s*(box|pack|bundle|case|pallet|roll|sheet|piece|each|ft|sf|lf)\M');
 if v_basis is not null and coalesce(v_basis[1],v_basis[2])<>lower(btrim(v_item.unit)) then return jsonb_build_object('ok',false); end if;
 insert into public.quote_product_match_confirmations(bid_id,item_id,actor_id,actor_label,source_fingerprint,source_snapshot,selling_unit)
 values(p_bid_id,p_item_id,p_actor_id,v_label,p_source_fingerprint,v_snapshot,p_selling_unit) on conflict(bid_id,item_id,source_fingerprint) where revoked_at is null do nothing;
 return jsonb_build_object('ok',true);
exception when lock_not_available then
 raise exception using errcode='55P03',message='Another update is in progress. Nothing was saved; retry after it finishes.';
end $$;
revoke all on function public.staff_confirm_product_match(uuid,uuid,uuid,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.staff_confirm_product_match(uuid,uuid,uuid,uuid,jsonb,text,text) to service_role;

-- Reusable predicate. Callers must lock item/bid/price before finalizing a route.
create function public.quote_product_match_is_eligible(p_item_id uuid,p_bid_id uuid)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare v_item public.quote_comparison_items%rowtype; v_bid public.quote_comparison_bids%rowtype; v_price public.quote_comparison_prices%rowtype; v_snapshot jsonb; v_literal text; v_requested text; v_basis text[];
begin
 select * into v_item from public.quote_comparison_items where id=p_item_id;
 select * into v_bid from public.quote_comparison_bids where id=p_bid_id and comparison_id=v_item.comparison_id;
 select * into v_price from public.quote_comparison_prices where bid_id=p_bid_id and item_id=p_item_id;
 if v_item.id is null or v_bid.id is null or v_price.item_id is null or v_item.quantity is null or v_item.quantity::text in ('NaN','Infinity','-Infinity') or v_item.quantity<=0 or length(btrim(coalesce(v_item.unit,'')))=0 or v_price.is_available is distinct from true or v_price.unit_price is null or v_price.unit_price::text in ('NaN','Infinity','-Infinity') or v_price.unit_price<0 or length(btrim(coalesce(v_price.notes,'')))=0 or v_bid.status='declined' or v_bid.trust_level_snapshot='do-not-use' then return false; end if;
 v_snapshot:=jsonb_build_object('item',jsonb_build_object('id',v_item.id,'description',v_item.description,'specification',v_item.specification,'quantity',v_item.quantity,'unit',v_item.unit),'bid',jsonb_build_object('id',v_bid.id,'supplier_id',v_bid.supplier_id,'trust_level_snapshot',v_bid.trust_level_snapshot),'price',jsonb_build_object('unit_price',v_price.unit_price,'is_available',v_price.is_available,'notes',v_price.notes));
 if exists(select 1 from public.quote_product_match_confirmations c where c.bid_id=p_bid_id and c.item_id=p_item_id and c.revoked_at is null and c.source_snapshot=v_snapshot and lower(btrim(c.selling_unit))=lower(btrim(v_item.unit))) then
   if v_price.notes ~* '\m(not available|unavailable|out of stock|not included|exclud\w*)\M' then return false; end if;
   v_basis:=regexp_match(lower(v_price.notes),'\mper\s+(box|pack|bundle|case|pallet|roll|sheet|piece|each|foot|feet|sq\.?\s*ft)\M|/\s*(box|pack|bundle|case|pallet|roll|sheet|piece|each|ft|sf|lf)\M');
   return v_basis is null or coalesce(v_basis[1],v_basis[2])=lower(btrim(v_item.unit));
 end if;
 v_literal:=lower(regexp_replace(btrim(v_price.notes),'\s+',' ','g'));
 v_requested:=lower(regexp_replace(btrim(v_item.description||' '||v_item.specification),'\s+',' ','g'));
 return coalesce(v_literal=v_requested and v_literal !~ '\m(not available|unavailable|substitut\w*|alternative|instead|equivalent|replacement|out of stock|back\s?order\w*|not included|exclud\w*)\M' and v_literal !~ '\m(per|by the|sold as|priced as)\s+\w+|/\s*(ea|each|pc|piece|box|pack|bundle|case|pallet|roll|sheet|ft|sf|lf|sq\.?\s*ft)\M',false);
end $$;
revoke all on function public.quote_product_match_is_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.quote_product_match_is_eligible(uuid,uuid) to service_role;

-- Superseded public entry cannot bypass current-request verification.
create or replace function public.staff_award_quote_comparison_bid(p_comparison_id uuid,p_bid_id uuid)
returns void language plpgsql security invoker set search_path='' as $$begin raise exception 'Use the verified server award workflow'; end$$;
revoke all on function public.staff_award_quote_comparison_bid(uuid,uuid) from public,anon,authenticated,service_role;

-- Server validates current request semantics; this transaction checks its exact locked snapshot.
create function public.staff_award_reviewed_product_bid(p_comparison_id uuid,p_bid_id uuid,p_actor_id uuid,p_request_expected jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v_status text; v_bid public.quote_comparison_bids%rowtype; v_row record; v_request_id uuid; v_request_snapshot jsonb;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved' and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Supplier management permission is required'; end if;
 select status,request_id into v_status,v_request_id from public.quote_comparisons where id=p_comparison_id for update;
 if v_status is null or v_status not in ('draft','review') then raise exception 'comparison_locked'; end if;
 if v_request_id is not null then
   perform 1 from public.quote_requests where id=v_request_id for update nowait;
   perform 1 from public.quote_request_items where request_id=v_request_id order by id for update nowait;
   select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'department',r.department,'quantity',r.quantity,'unit',r.unit,'metadata',r.metadata,'qualification_status',r.qualification_status) order by r.id),'[]'::jsonb) into v_request_snapshot from public.quote_request_items r where r.request_id=v_request_id;
   if v_request_snapshot is distinct from p_request_expected or v_request_snapshot='[]'::jsonb then raise exception 'request_source_changed'; end if;
 elsif p_request_expected is distinct from '[]'::jsonb then raise exception 'request_source_changed'; end if;
 perform 1 from public.quote_comparison_bids where comparison_id=p_comparison_id order by id for update nowait;
 select * into v_bid from public.quote_comparison_bids where id=p_bid_id and comparison_id=p_comparison_id;
 if not found or v_bid.status='declined' or v_bid.trust_level_snapshot='do-not-use' or v_bid.delivery_charge is null or v_bid.delivery_charge<0 or v_bid.tax_percent is null or v_bid.tax_percent<0 or v_bid.tax_percent>100 then raise exception 'bid_not_eligible'; end if;
 perform 1 from public.quote_comparison_items where comparison_id=p_comparison_id order by id for update nowait;
 perform 1 from public.quote_comparison_prices where bid_id=p_bid_id order by item_id for update nowait;
 if not exists(select 1 from public.quote_comparison_items where comparison_id=p_comparison_id) then raise exception 'no_requested_items'; end if;
 for v_row in select i.id,i.description,i.specification,i.quantity,i.unit,p.unit_price,p.is_available,p.notes
 from public.quote_comparison_items i left join public.quote_comparison_prices p on p.item_id=i.id and p.bid_id=p_bid_id where i.comparison_id=p_comparison_id loop
   if v_row.quantity is null or v_row.quantity<=0 or length(btrim(v_row.unit))=0 or v_row.unit is null or v_row.is_available is distinct from true or v_row.unit_price is null or v_row.unit_price<0 or length(btrim(coalesce(v_row.notes,'')))=0 then raise exception 'price_or_source_missing'; end if;
   if not public.quote_product_match_is_eligible(v_row.id,p_bid_id) then raise exception 'product_match_needs_review'; end if;
 end loop;
 update public.quote_comparison_bids set status=case when id=p_bid_id then 'awarded' when status='awarded' then 'received' else status end where comparison_id=p_comparison_id;
 update public.quote_comparisons set awarded_bid_id=p_bid_id,status='awarded' where id=p_comparison_id;
exception when lock_not_available then
 raise exception using errcode='55P03',message='Another update is in progress. Nothing was saved; retry after it finishes.';
end $$;
revoke all on function public.staff_award_reviewed_product_bid(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.staff_award_reviewed_product_bid(uuid,uuid,uuid,jsonb) to service_role;

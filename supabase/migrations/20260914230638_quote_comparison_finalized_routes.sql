-- Depends on trusted_product_match (signed actor predicate + locked match checker).
-- Immutable procurement snapshots; existing single-bid documents remain unchanged.
create table public.quote_comparison_routes (
 id uuid primary key default gen_random_uuid(),
 comparison_id uuid not null references public.quote_comparisons(id),
 request_id uuid references public.quote_requests(id),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 draft_revision integer not null, source_fingerprint text not null check(source_fingerprint ~ '^[a-f0-9]{64}$'),
 idempotency_key uuid not null, source_snapshot jsonb not null,
 material_subtotal numeric(16,2) not null, delivery_total numeric(16,2) not null,
 supplier_tax_total numeric(16,2) not null, landed_total numeric(16,2) not null,
 unique(comparison_id,idempotency_key),unique(comparison_id,id)
);
create table public.quote_comparison_route_suppliers (
 route_id uuid not null references public.quote_comparison_routes(id),
 supplier_id text not null check(length(btrim(supplier_id)) between 1 and 160), bid_id uuid not null references public.quote_comparison_bids(id),
 supplier_name text not null, material_subtotal numeric(16,2) not null,
 delivery_charge numeric(16,2) not null check(delivery_charge >= 0), tax_percent numeric not null check(tax_percent between 0 and 100),
 tax_amount numeric(16,2) not null, landed_total numeric(16,2) not null, lead_time_days integer,
 tax_basis text not null default 'materials_and_delivery' check(tax_basis='materials_and_delivery'),
 primary key(route_id,supplier_id)
);
create table public.quote_comparison_route_items (
 route_id uuid not null references public.quote_comparison_routes(id), item_id uuid not null references public.quote_comparison_items(id),
 source_request_item_id uuid references public.quote_request_items(id), supplier_id text not null check(length(btrim(supplier_id)) between 1 and 160),
 bid_id uuid not null, quantity numeric not null check(quantity > 0), unit text not null,
 unit_cost numeric not null check(unit_cost >= 0), line_cost numeric(16,2) not null,
 source_snapshot jsonb not null, primary key(route_id,item_id),
 foreign key(bid_id,item_id) references public.quote_comparison_prices(bid_id,item_id),
 foreign key(route_id,supplier_id) references public.quote_comparison_route_suppliers(route_id,supplier_id)
);
alter table public.quote_comparisons add column active_route_id uuid;
alter table public.quote_comparisons add constraint quote_comparison_active_route_scope foreign key(id,active_route_id) references public.quote_comparison_routes(comparison_id,id);
create index quote_routes_request_idx on public.quote_comparison_routes(request_id);
create index quote_routes_actor_idx on public.quote_comparison_routes(created_by);
create index quote_route_items_source_idx on public.quote_comparison_route_items(source_request_item_id);
create index quote_route_items_supplier_idx on public.quote_comparison_route_items(supplier_id);
create index quote_route_items_price_idx on public.quote_comparison_route_items(bid_id,item_id);
create index quote_route_items_item_idx on public.quote_comparison_route_items(item_id);
create index quote_route_suppliers_supplier_idx on public.quote_comparison_route_suppliers(supplier_id);
create index quote_route_suppliers_bid_idx on public.quote_comparison_route_suppliers(bid_id);
alter table public.quote_comparison_routes enable row level security;
alter table public.quote_comparison_route_items enable row level security;
alter table public.quote_comparison_route_suppliers enable row level security;
revoke all on public.quote_comparison_routes,public.quote_comparison_route_items,public.quote_comparison_route_suppliers from public,anon,authenticated;
grant select on public.quote_comparison_routes,public.quote_comparison_route_items,public.quote_comparison_route_suppliers to authenticated;
grant all on public.quote_comparison_routes,public.quote_comparison_route_items,public.quote_comparison_route_suppliers to service_role;
create policy route_staff_read on public.quote_comparison_routes for select to authenticated using(public.can_review_product_match());
create policy route_item_staff_read on public.quote_comparison_route_items for select to authenticated using(public.can_review_product_match());
create policy route_supplier_staff_read on public.quote_comparison_route_suppliers for select to authenticated using(public.can_review_product_match());

create function public.staff_finalize_quote_comparison_route(p_comparison_id uuid,p_actor_id uuid,p_expected_revision integer,p_source_fingerprint text,p_idempotency_key uuid,p_expected_request_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_parent public.quote_comparisons%rowtype; v_item public.quote_comparison_items%rowtype;
 v_bid public.quote_comparison_bids%rowtype; v_price public.quote_comparison_prices%rowtype;
 v_route uuid; v_bid_id uuid; v_supplier_id text; v_raw jsonb; v_alloc jsonb := '[]'; v_source jsonb;
 v_group record; v_count integer; v_subtotal numeric; v_tax numeric;
 v_material numeric := 0; v_delivery numeric := 0; v_taxes numeric := 0;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 select * into v_parent from public.quote_comparisons where id=p_comparison_id for update;
 if not found then raise exception 'Comparison not found'; end if;
 select id into v_route from public.quote_comparison_routes where comparison_id=p_comparison_id and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('ok',true,'routeId',v_route,'alreadyFinalized',true); end if;
 if v_parent.status not in ('draft','review') or v_parent.active_route_id is not null or v_parent.product_choice_draft_revision is distinct from p_expected_revision
 or v_parent.product_choice_draft_source_fingerprint is distinct from p_source_fingerprint then raise exception 'Source or draft changed'; end if;
 if v_parent.request_id is not null then
  perform 1 from public.quote_requests where id=v_parent.request_id for update;
  perform 1 from public.quote_request_items where request_id=v_parent.request_id order by id for update;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) order by id),'[]'::jsonb) into v_raw from public.quote_request_items where request_id=v_parent.request_id;
  if v_raw is distinct from p_expected_request_items then raise exception 'Request changed'; end if;
 elsif p_expected_request_items is distinct from '[]'::jsonb then raise exception 'Unexpected request source'; end if;
 perform 1 from public.quote_comparison_items where comparison_id=p_comparison_id order by id for update;
 perform 1 from public.quote_comparison_bids where comparison_id=p_comparison_id order by id for update;
 perform 1 from public.quote_comparison_prices p join public.quote_comparison_items i on i.id=p.item_id where i.comparison_id=p_comparison_id order by p.bid_id,p.item_id for update of p;
 perform 1 from public.quote_product_match_confirmations c join public.quote_comparison_items i on i.id=c.item_id where i.comparison_id=p_comparison_id order by c.id for update of c;
 select count(*) into v_count from public.quote_comparison_items where comparison_id=p_comparison_id;
 if v_count=0 or v_count>1000 or coalesce(jsonb_typeof(v_parent.product_choice_draft->'selections'),'')<>'object'
 or (select count(*) from jsonb_object_keys(v_parent.product_choice_draft->'selections'))<>v_count then raise exception 'Full product coverage required'; end if;
 for v_item in select * from public.quote_comparison_items where comparison_id=p_comparison_id order by id loop
  v_bid_id := nullif(v_parent.product_choice_draft->'selections'->>v_item.id::text,'')::uuid;
  if v_bid_id is null or not public.quote_product_match_is_eligible(v_item.id,v_bid_id) then raise exception 'Product match requires review'; end if;
  select * into v_bid from public.quote_comparison_bids where id=v_bid_id and comparison_id=p_comparison_id;
  if not found or v_bid.status='declined' or v_bid.trust_level_snapshot='do-not-use' then raise exception 'Supplier unavailable'; end if;
  select * into v_price from public.quote_comparison_prices where bid_id=v_bid_id and item_id=v_item.id;
  if not found or not v_price.is_available or v_price.unit_price is null or v_price.unit_price::text in ('NaN','Infinity','-Infinity') or v_price.unit_price<0
   or v_item.quantity is null or v_item.quantity::text in ('NaN','Infinity','-Infinity') or v_item.quantity<=0 or nullif(btrim(v_item.unit),'') is null then raise exception 'Invalid product price'; end if;
  if v_bid.delivery_charge is null or v_bid.delivery_charge::text in ('NaN','Infinity','-Infinity') or v_bid.delivery_charge<0
   or v_bid.tax_percent is null or v_bid.tax_percent::text in ('NaN','Infinity','-Infinity') or v_bid.tax_percent not between 0 and 100 then raise exception 'Supplier freight and tax required'; end if;
  -- Imported bid identities are directoryId:quoteId; retain the real directory ID
  -- and separately snapshot the source bid. Never fabricate a supplier row.
  v_supplier_id:=split_part(v_bid.supplier_id,':',1);
  if nullif(btrim(v_supplier_id),'') is null then raise exception 'Supplier identity missing'; end if;
  if exists(select 1 from jsonb_array_elements(v_alloc) a where a->>'supplier_id'=v_supplier_id and a->>'bid_id'<>v_bid.id::text) then raise exception 'Resolve combined terms for multiple quotes from one supplier'; end if;
  v_alloc := v_alloc || jsonb_build_array(jsonb_build_object('item_id',v_item.id,'source_request_item_id',v_item.source_request_item_id,'supplier_id',v_supplier_id,'bid_id',v_bid.id,'quantity',v_item.quantity,'unit',v_item.unit,'unit_cost',v_price.unit_price,'line_cost',round(v_item.quantity*v_price.unit_price,2),'source_snapshot',jsonb_build_object('item',to_jsonb(v_item),'bid',to_jsonb(v_bid),'price',to_jsonb(v_price),'match_confirmations',(select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) from public.quote_product_match_confirmations c where c.bid_id=v_bid_id and c.item_id=v_item.id))));
 end loop;
 v_route := gen_random_uuid();
 v_source := jsonb_build_object('request_items',coalesce(v_raw,'[]'::jsonb),'allocations',v_alloc);
 insert into public.quote_comparison_routes(id,comparison_id,request_id,created_by,draft_revision,source_fingerprint,idempotency_key,source_snapshot,material_subtotal,delivery_total,supplier_tax_total,landed_total)
 values(v_route,p_comparison_id,v_parent.request_id,p_actor_id,p_expected_revision,p_source_fingerprint,p_idempotency_key,v_source,0,0,0,0);
 for v_group in select a->>'supplier_id' supplier_id,a->>'bid_id' bid_id,sum((a->>'line_cost')::numeric) subtotal from jsonb_array_elements(v_alloc) a group by a->>'supplier_id',a->>'bid_id' loop
  select * into v_bid from public.quote_comparison_bids where id=v_group.bid_id::uuid;
  v_subtotal:=v_group.subtotal; v_tax:=round((v_subtotal+v_bid.delivery_charge)*v_bid.tax_percent/100,2);
  insert into public.quote_comparison_route_suppliers(route_id,supplier_id,bid_id,supplier_name,material_subtotal,delivery_charge,tax_percent,tax_amount,landed_total,lead_time_days) values(v_route,v_group.supplier_id,v_bid.id,v_bid.supplier_name_snapshot,v_subtotal,v_bid.delivery_charge,v_bid.tax_percent,v_tax,v_subtotal+v_bid.delivery_charge+v_tax,case when v_bid.lead_time_days>=0 then v_bid.lead_time_days else null end);
  v_material:=v_material+v_subtotal; v_delivery:=v_delivery+v_bid.delivery_charge; v_taxes:=v_taxes+v_tax;
 end loop;
 insert into public.quote_comparison_route_items select v_route,(a->>'item_id')::uuid,(a->>'source_request_item_id')::uuid,a->>'supplier_id',(a->>'bid_id')::uuid,(a->>'quantity')::numeric,a->>'unit',(a->>'unit_cost')::numeric,(a->>'line_cost')::numeric,a->'source_snapshot' from jsonb_array_elements(v_alloc) a;
 update public.quote_comparison_routes set material_subtotal=v_material,delivery_total=v_delivery,supplier_tax_total=v_taxes,landed_total=v_material+v_delivery+v_taxes where id=v_route;
 -- This is procurement selection only. Do not send, generate invoices or rewrite client prices.
 update public.quote_comparisons set active_route_id=v_route,status='awarded' where id=p_comparison_id;
 return jsonb_build_object('ok',true,'routeId',v_route,'alreadyFinalized',false);
end $$;
revoke all on function public.staff_finalize_quote_comparison_route(uuid,uuid,integer,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.staff_finalize_quote_comparison_route(uuid,uuid,integer,text,uuid,jsonb) to service_role;
